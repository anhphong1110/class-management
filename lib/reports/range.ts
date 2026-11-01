import { PERIOD_LABELS, periodRange, resolvePeriod, type NullableTermDates } from '@/lib/domain/period'
import { isValidIsoDate, todayInVietnam } from '@/lib/domain/date'
import { viDate } from './format'
import type { Bucket } from './types'

export type ReportPeriod = 'week' | 'month' | 'term' | 'year' | 'custom'
export type ReportRange = { from: string; to: string; bucket: Bucket; name: string }

export const TERMS_NOT_SET = 'Cô chưa đặt ngày học kỳ trong Cài đặt.'
export const BAD_RANGE = 'Khoảng ngày chưa hợp lệ.'
const MAX_DAYS = 400
const DAY_MS = 86_400_000

const dayCount = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

/** `periodRange` trả khoảng nửa mở theo instant; đổi sang ngày Việt Nam gồm hai đầu. */
function toDates(r: { from: string | null; to: string | null }): { from: string; to: string } {
  return {
    from: todayInVietnam(new Date(r.from!)),
    to: todayInVietnam(new Date(new Date(r.to!).getTime() - 1)),
  }
}

export function resolveReportRange(
  period: ReportPeriod,
  now: Date,
  terms: NullableTermDates,
  custom?: { from?: string | null; to?: string | null },
): ReportRange {
  if (period === 'custom') {
    const { from, to } = custom ?? {}
    if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to || dayCount(from, to) > MAX_DAYS) throw new Error(BAD_RANGE)
    const days = dayCount(from, to)
    return {
      from,
      to,
      bucket: days <= 14 ? 'day' : days <= 92 ? 'week' : 'month',
      name: `Từ ${viDate(from)} đến ${viDate(to)}`,
    }
  }

  if (period === 'week') return { ...toDates(periodRange('week', now, { term1Start: '', term1End: '', term2Start: '', term2End: '' })), bucket: 'day', name: PERIOD_LABELS.week }
  if (period === 'month') return { ...toDates(periodRange('month', now, { term1Start: '', term1End: '', term2Start: '', term2End: '' })), bucket: 'week', name: PERIOD_LABELS.month }

  if (period === 'year') {
    if (!terms.term1Start || !terms.term2End) throw new Error(TERMS_NOT_SET)
    return { from: terms.term1Start, to: terms.term2End, bucket: 'month', name: PERIOD_LABELS.year }
  }

  // Học kỳ: kỳ chứa `now`; thiếu ngày học kỳ 2 thì luôn lấy học kỳ 1 (cùng cách bảng xếp hạng làm).
  const { period: resolved, term } = resolvePeriod('term', now, terms)
  if (resolved !== 'term' || term === null) throw new Error(TERMS_NOT_SET)
  const r = periodRange('term', now, {
    term1Start: terms.term1Start ?? '',
    term1End: terms.term1End ?? '',
    term2Start: term === 2 ? terms.term2Start! : '9999-12-31',
    term2End: term === 2 ? terms.term2End! : '9999-12-31',
  })
  return { ...toDates(r), bucket: 'month', name: PERIOD_LABELS.term }
}
