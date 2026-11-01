import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'

export type AccountRow = {
  studentId: string
  name: string
  username: string | null
  loginDisabled: boolean
}

/**
 * Danh sách học sinh chưa lưu trữ kèm tài khoản (nếu có). Chỉ gọi sau `requireTeacher()`; đọc bằng phiên của cô
 * (policy teacher_select trên profiles đủ dùng), giới hạn theo lớp của cô.
 */
export async function getAccountRows(classId: string): Promise<AccountRow[]> {
  const supabase = await createServerSupabase()
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name, roll_no')
    .eq('class_id', classId)
    .is('archived_at', null)
    .order('roll_no', { ascending: true })
  if (error) throw new Error(error.message)

  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('student_id, username, login_disabled')
    .eq('class_id', classId)
    .eq('role', 'student')
  if (profError) throw new Error(profError.message)
  const byStudent = new Map((profiles ?? []).map((p) => [p.student_id, p]))

  return (students ?? []).map((s) => {
    const p = byStudent.get(s.id)
    return { studentId: s.id, name: s.full_name, username: p?.username ?? null, loginDisabled: p?.login_disabled ?? false }
  })
}
