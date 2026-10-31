import type { NullableTermDates } from '@/lib/domain/period'

export type MissionPeriod = 'day' | 'week' | 'month' | 'term'

export const MISSION_PERIODS: MissionPeriod[] = ['day', 'week', 'month', 'term']

export const MISSION_PERIOD_LABELS: Record<MissionPeriod, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  term: 'Học kỳ',
}

// Việt Nam là UTC+7 quanh năm (không có giờ mùa hè).
const VN_OFFSET_MS = 7 * 3600_000
const DAY_MS = 86_400_000

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * Khóa kỳ của một nhiệm vụ, khớp private.mission_period_key (supabase/migrations/…0016_missions.sql).
 * Dùng để hiển thị số bạn đã hoàn thành trong kỳ hiện tại; nguồn sự thật vẫn là hàm SQL.
 */
export function missionPeriodKey(period: MissionPeriod, at: Date, terms: NullableTermDates): string {
  const vn = new Date(at.getTime() + VN_OFFSET_MS) // các getter UTC đọc ra giờ Việt Nam
  const y = vn.getUTCFullYear()
  const m = vn.getUTCMonth()
  const d = vn.getUTCDate()

  switch (period) {
    case 'day':
      return `${y}-${pad(m + 1)}-${pad(d)}`
    case 'month':
      return `${y}-${pad(m + 1)}`
    case 'week': {
      // Tuần ISO: thứ Năm của tuần quyết định năm của tuần.
      const sinceMonday = (vn.getUTCDay() + 6) % 7
      const thursday = Date.UTC(y, m, d) + (3 - sinceMonday) * DAY_MS
      const isoYear = new Date(thursday).getUTCFullYear()
      const week = Math.floor((thursday - Date.UTC(isoYear, 0, 1)) / DAY_MS / 7) + 1
      return `${isoYear}-W${pad(week)}`
    }
    case 'term': {
      const second =
        !!(terms.term2Start && terms.term2End) &&
        at.getTime() >= Date.parse(`${terms.term2Start}T00:00:00+07:00`)
      const start = terms.term1Start
        ? Number(terms.term1Start.slice(0, 4))
        : m + 1 >= 8
          ? y
          : y - 1
      return `T${second ? 2 : 1}-${start}-${start + 1}`
    }
  }
}
