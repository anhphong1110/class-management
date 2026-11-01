import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Status } from './csv'
import { attended } from './rules'

export type { Status }

export type RecentDay = { date: string; present: number; absent: number; excused: number; late: number }
export type MonthDay = { date: string; present: number; absent: number; excused: number; late: number; attended: number; total: number }
export type MonthRow = { studentId: string; date: string; status: Status }

const PAGE = 1000

export async function getDay(classId: string, date: string): Promise<Record<string, Status>> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('attendance').select('student_id, status, students!inner(archived_at)')
    .eq('class_id', classId)
    .eq('date', date)
    .is('students.archived_at', null)
    .order('student_id')
  if (error) throw new Error(error.message)
  return Object.fromEntries((data ?? []).map((r) => [r.student_id as string, r.status as Status]))
}

function tally(rows: { status: string }[]) {
  const c = { present: 0, absent: 0, excused: 0, late: 0 }
  for (const r of rows) {
    if (r.status === 'present') c.present++
    else if (r.status === 'absent_unexcused') c.absent++
    else if (r.status === 'absent_excused') c.excused++
    else if (r.status === 'late') c.late++
  }
  return c
}

/** Các ngày gần nhất có ít nhất một dòng, ngày mới trước. */
export async function getRecentDays(classId: string, limit = 5): Promise<RecentDay[]> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('attendance')
    .select('date, status, students!inner(archived_at)')
    .eq('class_id', classId)
    .is('students.archived_at', null)
    .order('date', { ascending: false })
    .limit(PAGE)
  if (error) throw new Error(error.message)
  const byDate = new Map<string, { status: string }[]>()
  for (const r of data ?? []) {
    const list = byDate.get(r.date as string) ?? []
    list.push({ status: r.status as string })
    byDate.set(r.date as string, list)
  }
  return [...byDate.keys()]
    .sort()
    .reverse()
    .slice(0, limit)
    .map((date) => ({ date, ...tally(byDate.get(date)!) }))
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export async function getMonth(classId: string, month: string): Promise<{ days: MonthDay[]; rows: MonthRow[] }> {
  const supabase = await createServerSupabase()
  const { from, to } = monthRange(month)
  const rows: MonthRow[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('attendance')
      .select('student_id, date, status, students!inner(archived_at)')
      .eq('class_id', classId)
      .is('students.archived_at', null)
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('student_id')
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) rows.push({ studentId: r.student_id as string, date: r.date as string, status: r.status as Status })
    if ((data?.length ?? 0) < PAGE) break
  }
  const byDate = new Map<string, MonthRow[]>()
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r])
  const days = [...byDate.keys()].sort().map((date) => {
    const list = byDate.get(date)!
    return { date, ...tally(list), attended: list.filter((r) => attended(r.status)).length, total: list.length }
  })
  return { days, rows }
}
