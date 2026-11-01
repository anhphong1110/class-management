import 'server-only'
import { createServerSupabase } from '@/lib/supabase/server'
import { resolveAvatars, type AvatarValue } from '@/lib/avatars/resolve'
import { toVietnameseMessage } from '@/lib/errors'
import { resolveReportRange, type ReportPeriod, type ReportRange } from './range'
import type { ReportData, ReportSummary } from './types'

export type LoadedReport =
  | { error: string }
  | { error?: undefined; range: ReportRange; data: ReportData; avatars: Record<string, AvatarValue> }

/** Đọc ngày học kỳ của lớp, tính khoảng ngày rồi gọi `report_summary`. Lỗi do người dùng chọn (ngày sai, chưa đặt học kỳ) trả `{ error }`; lỗi hệ thống thì throw. */
export async function loadReport(
  classId: string,
  period: ReportPeriod,
  custom: { from?: string | null; to?: string | null },
  now: Date = new Date(),
): Promise<LoadedReport> {
  const supabase = await createServerSupabase()
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('term1_start, term1_end, term2_start, term2_end')
    .eq('id', classId)
    .single()
  if (clsError) throw new Error(clsError.message)

  let range: ReportRange
  try {
    range = resolveReportRange(
      period,
      now,
      { term1Start: cls.term1_start, term1End: cls.term1_end, term2Start: cls.term2_start, term2End: cls.term2_end },
      custom,
    )
  } catch (e) {
    return { error: e instanceof Error ? e.message : toVietnameseMessage('invalid_range') }
  }

  const { data, error } = await supabase.rpc('report_summary', { p_from: range.from, p_to: range.to, p_bucket: range.bucket })
  if (error) {
    if (error.message === 'invalid_range') return { error: toVietnameseMessage('invalid_range') }
    throw new Error(error.message)
  }
  const summary = data as unknown as ReportSummary
  const avatarMap = await resolveAvatars(summary.progress.map((p) => p.avatarId))
  const avatars: Record<string, AvatarValue> = {}
  for (const [id, v] of avatarMap) avatars[id] = v
  return { range, data: { ...summary, from: range.from, to: range.to, bucket: range.bucket }, avatars }
}
