import { weekdayInVietnam } from '@/lib/domain/date'

/** Năm khối của trang trình chiếu, theo thứ tự tự động chuyển. */
export const DISPLAY_BLOCKS = ['top5', 'week', 'highlight', 'today', 'pinned'] as const
export type DisplayBlock = (typeof DISPLAY_BLOCKS)[number]

export const nextBlockIndex = (i: number, count: number = DISPLAY_BLOCKS.length) => (i + 1) % count

export function buildHighlight(weekTotal: number, leadingGroup: string | null): string {
  const head = `Cả lớp đạt ${weekTotal} sao thi đua trong tuần.`
  return leadingGroup ? `${head} ${leadingGroup} dẫn đầu.` : head
}

/** Thứ (1–6) cần hiện; null khi Chủ Nhật hoặc thứ Bảy đang tắt. Chỉ phụ thuộc (now, saturdayOn) nên làm mới sau nửa đêm sẽ đổi ngày. */
export function selectDisplayWeekday(now: Date, saturdayOn: boolean): number | null {
  const d = weekdayInVietnam(now)
  if (d === 0) return null
  if (d === 6 && !saturdayOn) return null
  return d
}
