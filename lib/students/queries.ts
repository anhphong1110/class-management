import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { todayInVietnam } from '@/lib/domain/date'
import { getGroups, getStudentsWithStars, type StudentWithStars } from '@/lib/stars/queries'

export type TodayStatus = 'present' | 'late' | 'absent_excused' | 'absent_unexcused' | null
export type GroupRole = 'leader' | 'deputy' | 'member'

export type StudentCard = StudentWithStars & {
  today: TodayStatus
  groupName: string | null
  groupRole: GroupRole | null
}

export async function getStudentCards(classId: string): Promise<StudentCard[]> {
  const supabase = await createServerSupabase()
  const [students, groups, { data: att }, { data: members }] = await Promise.all([
    getStudentsWithStars(classId),
    getGroups(classId),
    supabase.from('attendance').select('student_id, status').eq('class_id', classId).eq('date', todayInVietnam()),
    supabase.from('group_members').select('student_id, role').eq('class_id', classId),
  ])
  const today = new Map((att ?? []).map((a) => [a.student_id as string, a.status as TodayStatus]))
  const roles = new Map((members ?? []).map((m) => [m.student_id as string, m.role as GroupRole]))
  const groupOf = new Map<string, string>()
  for (const g of groups) for (const id of g.memberIds) groupOf.set(id, g.name)
  return students.map((s) => ({
    ...s,
    today: today.get(s.id) ?? null,
    groupName: groupOf.get(s.id) ?? null,
    groupRole: roles.get(s.id) ?? null,
  }))
}
