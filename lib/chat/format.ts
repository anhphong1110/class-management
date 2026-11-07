import { WEEKDAYS, formatVietnameseDate, weekdayInVietnam } from '@/lib/domain/date'
import { PERIOD_LABELS, type Period } from '@/lib/domain/period'
import { MAX_TOP, type TimetableDay } from '@/lib/chat/intents'
import { PERIODS, slotKey } from '@/lib/timetable/layout'

const DAY_MS = 86_400_000

export type TimetableData = {
  slots: Record<string, string | null>
  subjects: { id: string; name: string; color: string }[]
  saturday: boolean
}

function resolveDay(day: TimetableDay, now: Date): { weekday: number; label: string } {
  if (day === 'today') return { weekday: weekdayInVietnam(now), label: `Hôm nay (${formatVietnameseDate(now)})` }
  if (day === 'tomorrow') {
    const next = new Date(now.getTime() + DAY_MS)
    return { weekday: weekdayInVietnam(next), label: `Ngày mai (${formatVietnameseDate(next)})` }
  }
  return { weekday: day, label: WEEKDAYS[day] }
}

/** Câu trả lời thời khóa biểu cho một ngày. Giờ Việt Nam, ô trống và môn đã xóa thì bỏ qua. */
export function formatTimetableReply(day: TimetableDay, now: Date, tt: TimetableData): string {
  const { weekday, label } = resolveDay(day, now)
  if (weekday === 0) return `${label} lớp mình được nghỉ, không có tiết học.`
  if (weekday === 6 && !tt.saturday) return `${label} lớp mình không học.`

  const byId = new Map(tt.subjects.map((s) => [s.id, s.name]))
  const lines: string[] = []
  for (const session of ['morning', 'afternoon'] as const) {
    const parts = PERIODS.filter((p) => p.session === session).flatMap(({ period }) => {
      const name = byId.get(tt.slots[slotKey(weekday, session, period)] ?? '')
      return name ? [`Tiết ${period} ${name}`] : []
    })
    if (parts.length) lines.push(`${session === 'morning' ? 'Sáng' : 'Chiều'}: ${parts.join(', ')}`)
  }
  if (lines.length === 0) return `${label} chưa có tiết nào trong thời khóa biểu.`
  return [`${label} lớp mình học:`, ...lines].join('\n')
}

/** Một dòng của leaderboard_for_period (số có thể là chuỗi khi qua PostgREST). */
export type TopRow = { full_name: string; stars: number | string; rank: number | string }

export function formatTopStars(period: Period, rows: TopRow[], limit: number): string {
  if (rows.length === 0) return 'Chưa có bảng xếp hạng để xem.'
  const label = PERIOD_LABELS[period]
  const top = rows.map((r) => ({ name: r.full_name, stars: Number(r.stars), rank: Number(r.rank) }))
  if (top[0].stars <= 0) return `${label} chưa có bạn nào có sao.`
  // Đồng hạng thì cùng được liệt kê; giới hạn cứng để tin nhắn không quá dài.
  const shown = top.filter((r) => r.rank <= limit).slice(0, MAX_TOP)
  return [`${label} dẫn đầu:`, ...shown.map((r) => `${r.rank}. ${r.name} · ${r.stars} sao`)].join('\n')
}

export type MyStarsData = { competition: number | null; available: number; rank: number | null; classSize: number | null }

export function formatMyStars(d: MyStarsData): string {
  if (d.competition === null) return `Bạn có ${d.available} sao có thể đổi quà.`
  const head = `Bạn có ${d.competition} sao thi đua và ${d.available} sao có thể đổi quà.`
  return d.rank !== null && d.classSize !== null ? `${head} Cả năm bạn đứng hạng ${d.rank}/${d.classSize}.` : head
}

export type StudentStarsData = { fullName: string; competition: number; available: number }

export function formatStudentStars(list: StudentStarsData[]): string {
  if (list.length === 0) return 'Mình không tìm thấy bạn nào có tên đó trong lớp.'
  if (list.length === 1) {
    const s = list[0]
    return `${s.fullName} có ${s.competition} sao thi đua và ${s.available} sao có thể đổi quà.`
  }
  return [
    `Có ${list.length} bạn phù hợp:`,
    ...list.map((s) => `- ${s.fullName}: ${s.competition} sao thi đua, ${s.available} sao đổi quà`),
  ].join('\n')
}
