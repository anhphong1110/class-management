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
