import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'

export type ArchivedClass = { id: string; className: string; schoolYear: string; archivedAt: string }

/** Các năm học đã lưu trữ của giáo viên (RPC definer, vì RLS không cho đọc lớp đã lưu trữ). */
export async function getArchivedClasses(): Promise<ArchivedClass[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.rpc('my_archived_classes')
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as { id: string; class_name: string; school_year: string; archived_at: string }[]
  return rows.map((c) => ({ id: c.id, className: c.class_name, schoolYear: c.school_year, archivedAt: c.archived_at }))
}
