import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'

export type TimetableSubject = { id: string; name: string; color: string; sortOrder: number; usedCount: number }
export type Timetable = {
  subjects: TimetableSubject[]
  /** Khóa `<thứ>-<buổi>-<tiết>`; chỉ có khóa với ô đã có dòng. */
  slots: Record<string, string | null>
  saturday: boolean
}

export async function getTimetable(classId: string): Promise<Timetable> {
  const supabase = await createServerSupabase()
  const [subjectsRes, slotsRes, settingsRes] = await Promise.all([
    supabase.from('subjects').select('id, name, color, sort_order').eq('class_id', classId).order('sort_order').order('created_at'),
    supabase.from('timetable_slots').select('weekday, session, period, subject_id').eq('class_id', classId),
    supabase.from('class_settings').select('timetable_saturday').eq('class_id', classId).maybeSingle(),
  ])
  for (const r of [subjectsRes, slotsRes, settingsRes]) if (r.error) throw new Error(r.error.message)
  const slots: Record<string, string | null> = {}
  const used = new Map<string, number>()
  for (const s of slotsRes.data ?? []) {
    slots[`${s.weekday}-${s.session}-${s.period}`] = s.subject_id
    if (s.subject_id) used.set(s.subject_id, (used.get(s.subject_id) ?? 0) + 1)
  }
  return {
    subjects: (subjectsRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sort_order,
      usedCount: used.get(s.id) ?? 0,
    })),
    slots,
    saturday: settingsRes.data?.timetable_saturday ?? false,
  }
}
