const TZ = 'Asia/Ho_Chi_Minh'
const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

const fmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function vietnamParts(d: Date) {
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
  return { day: parts.day, month: parts.month, year: parts.year }
}

export function formatVietnameseDate(d: Date): string {
  const { day, month, year } = vietnamParts(d)
  const weekday = WEEKDAYS[new Date(Date.UTC(+year, +month - 1, +day)).getUTCDay()]
  return `${weekday}, ${day}/${month}/${year}`
}

export function todayInVietnam(now: Date = new Date()): string {
  const { day, month, year } = vietnamParts(now)
  return `${year}-${month}-${day}`
}

/** `YYYY-MM-DD` có thật trên lịch (từ chối 2026-02-31). */
export function isValidIsoDate(v: string | undefined | null): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

/** Thứ trong tuần theo giờ Việt Nam: 0 = Chủ Nhật ... 6 = Thứ Bảy. */
export function weekdayInVietnam(now: Date = new Date()): number {
  return new Date(`${todayInVietnam(now)}T00:00:00Z`).getUTCDay()
}
