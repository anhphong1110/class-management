import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import type { Role, SessionUser } from '@/lib/domain/types'

export type SessionDenied = 'no_profile' | 'class_archived'
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
    // Học sinh của lớp đã lưu trữ (năm học đã kết thúc) không vào được nữa. RLS (private.my_class_id) che
    // luôn lớp và hồ sơ học sinh khỏi họ, nên phải đọc cột archived_at của chính lớp mình bằng khóa dịch vụ.
    const { data: cls, error: clsError } = await createAdminSupabase()
      .from('classes')
      .select('archived_at')
      .eq('id', profile.class_id)
      .maybeSingle()
    if (clsError) throw new Error(clsError.message)
    if (!cls || cls.archived_at !== null) return denied('class_archived')

    const { data: student } = await supabase
      .from('students')
      .select('avatar_id, archived_at')
      .eq('id', profile.student_id)
      .maybeSingle()
    if (!student || student.archived_at !== null) return denied('no_profile')
    avatarId = student.avatar_id ?? null
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
