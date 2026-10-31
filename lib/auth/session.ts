import 'server-only'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Role, SessionUser } from '@/lib/domain/types'

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, class_id, role, display_name, student_id, avatar_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) return null

  const role = profile.role as Role
  let avatarId: string | null = profile.avatar_id ?? null

  if (role === 'student') {
    if (!profile.student_id) return null
    const { data: student } = await supabase
      .from('students')
      .select('avatar_id, archived_at')
      .eq('id', profile.student_id)
      .maybeSingle()
    if (!student || student.archived_at !== null) return null
    avatarId = student.avatar_id ?? null
  }

  return {
    userId: user.id,
    role,
    classId: profile.class_id,
    displayName: profile.display_name,
    studentId: profile.student_id ?? null,
    avatarId,
  }
}

export async function requireTeacher(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) redirect('/dang-xuat?reason=no_profile')
  if (u.role !== 'teacher') redirect('/em')
  return u
}

export async function requireStudent(): Promise<SessionUser> {
  const u = await getSessionUser()
  if (!u) redirect('/dang-xuat?reason=no_profile')
  if (u.role !== 'student') redirect('/tong-quan')
  return u
}
