export type Period = 'week' | 'month' | 'term' | 'year'

export const PERIOD_LABELS: Record<Period, string> = {
  week: 'Tuần này',
  month: 'Tháng này',
  term: 'Học kỳ',
  year: 'Cả năm',
}

export type TermDates = { term1Start: string; term1End: string; term2Start: string; term2End: string }

// Vietnam is UTC+7 all year (no DST), so an explicit offset is exact.
const VN_OFFSET_MS = 7 * 3600_000
const DAY_MS = 86_400_000

/** UTC instant of 00:00 Vietnam time on the given civil date. */
function vnMidnight(year: number, monthIndex: number, day: number): number {
  return Date.UTC(year, monthIndex, day) - VN_OFFSET_MS
}

function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return vnMidnight(y, m - 1, d)
}

export function periodRange(
  period: Period,
  now: Date,
  terms: TermDates,
): { from: string | null; to: string | null } {
  const iso = (ms: number) => new Date(ms).toISOString()
  // Shift so UTC getters read Vietnam wall-clock fields.
  const vn = new Date(now.getTime() + VN_OFFSET_MS)
  const y = vn.getUTCFullYear()
  const m = vn.getUTCMonth()
  const d = vn.getUTCDate()

  switch (period) {
    case 'week': {
      const sinceMonday = (vn.getUTCDay() + 6) % 7
      const from = vnMidnight(y, m, d - sinceMonday)
      return { from: iso(from), to: iso(from + 7 * DAY_MS) }
    }
    case 'month':
      return { from: iso(vnMidnight(y, m, 1)), to: iso(vnMidnight(y, m + 1, 1)) }
    case 'term': {
      const second = now.getTime() >= parseIsoDate(terms.term2Start)
      const start = second ? terms.term2Start : terms.term1Start
      const end = second ? terms.term2End : terms.term1End
      return { from: iso(parseIsoDate(start)), to: iso(parseIsoDate(end) + DAY_MS) }
    }
    case 'year':
      return { from: null, to: null }
  }
}
