import { todayInVietnam } from '@/lib/domain/date'

const TZ = 'Asia/Ho_Chi_Minh'

const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit' })

function pick(f: Intl.DateTimeFormat, d: Date): Record<string, string> {
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]))
}
const clock = { format: (d: Date) => { const p = pick(clockFmt, d); return `${p.hour}:${p.minute}` } }
const dayMonth = { format: (d: Date) => { const p = pick(dayFmt, d); return `${p.day}/${p.month}` } }

/** Giờ gửi theo giờ Việt Nam (dữ liệu lưu UTC): hôm nay "09:05", ngày khác "17/11 09:05". */
export function formatMessageTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const time = clock.format(at)
  return todayInVietnam(at) === todayInVietnam(now) ? time : `${dayMonth.format(at)} ${time}`
}

/** Thời gian ngắn cho danh sách hội thoại: hôm nay chỉ giờ, ngày khác chỉ "dd/MM". */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  return todayInVietnam(at) === todayInVietnam(now) ? clock.format(at) : dayMonth.format(at)
}
