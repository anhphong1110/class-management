import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Role, SessionUser } from '@/lib/domain/types'

export type SessionDenied = 'no_profile' | 'class_archived' | 'account_banned'
type SessionState = { user: SessionUser; reason?: undefined } | { user: null; reason: SessionDenied }

const denied = (reason: SessionDenied): SessionState => ({ user: null, reason })

const getSessionState = cache(async (): Promise<SessionState> => {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return denied('no_profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, class_id, role, display_name, student_id, avatar_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return denied('no_profile')

  const role = profile.role as Role
  let avatarId: string | null = profile.avatar_id ?? null

  if (role === 'student') {
    if (!profile.student_id) return denied('no_profile')
    // Một lần gọi hàm định danh cho cả lớp, học sinh đã lưu trữ và khóa đăng nhập (RLS che lớp và hồ sơ khỏi
    // học sinh đã lưu trữ nên không đọc trực tiếp được).
    const { data: rows, error } = await supabase.rpc('my_student_session')
    if (error) throw new Error(error.message)
    const session = rows?.[0]
    if (!session) return denied('no_profile')
    if (session.status === 'archived_class') return denied('class_archived')
    if (session.status === 'login_disabled') return denied('account_banned')
    if (session.status !== 'ok') return denied('no_profile')
    avatarId = session.avatar_id ?? null
  }

  return {
    user: {
      userId: user.id,
      role,
      classId: profile.class_id,
      displayName: profile.display_name,
      studentId: profile.student_id ?? null,
      avatarId,
    },
  }
})

export async function getSessionUser(): Promise<SessionUser | null> {
  return (await getSessionState()).user
}

/** Lý do không có phiên dùng được (để chuyển tới /dang-xuat kèm đúng câu báo). */
export async function getSessionDenial(): Promise<SessionDenied> {
  return (await getSessionState()).reason ?? 'no_profile'
}

async function denyRedirect(): Promise<never> {
  redirect(`/dang-xuat?reason=${await getSessionDenial()}`)
}

export async function requireTeacher(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) return denyRedirect()
  if (u.role !== 'teacher') redirect('/em')
  return u
}

export async function requireStudent(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) return denyRedirect()
  if (u.role !== 'student') redirect('/tong-quan')
  return u
}

export async function requireStudentOrTeacher(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) return denyRedirect()
  if (u.role !== 'student' && u.role !== 'teacher') redirect('/dang-xuat?reason=no_profile')
  return u
}
