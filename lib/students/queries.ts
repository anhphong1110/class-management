import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { getGroups, getStudentsWithStars, type StudentWithStars } from '@/lib/stars/queries'

export type GroupRole = 'leader' | 'deputy' | 'member'

export type StudentCard = StudentWithStars & {
  groupName: string | null
  groupRole: GroupRole | null
}

export async function getStudentCards(classId: string): Promise<StudentCard[]> {
  const supabase = await createServerSupabase()
  const [students, groups, membersRes] = await Promise.all([
    getStudentsWithStars(classId),
    getGroups(classId),
    supabase.from('group_members').select('student_id, role').eq('class_id', classId),
  ])
  if (membersRes.error) throw new Error(membersRes.error.message)
  const { data: members } = membersRes
  const roles = new Map((members ?? []).map((m) => [m.student_id as string, m.role as GroupRole]))
  const groupOf = new Map<string, string>()
  for (const g of groups) for (const id of g.memberIds) groupOf.set(id, g.name)
  return students.map((s) => ({
    ...s,
    groupName: groupOf.get(s.id) ?? null,
    groupRole: roles.get(s.id) ?? null,
  }))
}

/** Mọi mã học sinh trong lớp, kể cả đã lưu trữ (mã là duy nhất theo lớp). */
export async function getAllStudentCodes(classId: string): Promise<string[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('students').select('code').eq('class_id', classId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => (r.code as string).toUpperCase())
}
