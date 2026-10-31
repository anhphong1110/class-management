const TZ = 'Asia/Ho_Chi_Minh'

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function parts(d: Date) {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]))
  return { day: p.day, month: p.month, year: p.year }
}

/** Whole civil days between two instants, in Vietnam time (now - at). */
function dayDiff(at: Date, now: Date): number {
  const a = parts(at)
  const n = parts(now)
  const toDay = (p: { day: string; month: string; year: string }) =>
    Date.UTC(+p.year, +p.month - 1, +p.day) / 86_400_000
  return toDay(n) - toDay(a)
}

function ddmm(d: Date): string {
  const p = parts(d)
  return `${p.day}/${p.month}`
}

export function formatDayLabel(at: Date, now: Date): string {
  const diff = dayDiff(at, now)
  if (diff <= 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  return ddmm(at)
}

export function formatRelative(at: Date, now: Date): string {
  const diffMs = now.getTime() - at.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const days = dayDiff(at, now)
  if (days <= 0) return `${Math.floor(minutes / 60)} giờ trước`
  if (days === 1) return 'Hôm qua'
  return ddmm(at)
}
