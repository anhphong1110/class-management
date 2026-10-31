export type Session = 'morning' | 'afternoon'

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy',
}

/** 8 tiết trong ngày: 5 sáng rồi 3 chiều. */
export const PERIODS: { session: Session; period: number }[] = [
  ...[1, 2, 3, 4, 5].map((period) => ({ session: 'morning' as const, period })),
  ...[1, 2, 3].map((period) => ({ session: 'afternoon' as const, period })),
]

export const slotKey = (weekday: number, session: Session, period: number) => `${weekday}-${session}-${period}`

export function weekdays(saturday: boolean): number[] {
  return saturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]
}
