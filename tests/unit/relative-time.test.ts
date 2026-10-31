import { describe, expect, it } from 'vitest'
import { formatDayLabel, formatRelative } from '@/lib/domain/relative-time'

const now = new Date('2026-10-31T10:00:00Z') // 17:00 VN
const ago = (ms: number) => new Date(now.getTime() - ms)

describe('formatRelative', () => {
  it('just now', () => expect(formatRelative(ago(30_000), now)).toBe('Vừa xong'))
  it('minutes', () => expect(formatRelative(ago(10 * 60_000), now)).toBe('10 phút trước'))
  it('hours same day', () => expect(formatRelative(ago(3 * 3600_000), now)).toBe('3 giờ trước'))
  it('yesterday', () => expect(formatRelative(new Date('2026-10-30T10:00:00Z'), now)).toBe('Hôm qua'))
  it('yesterday across Vietnam midnight', () =>
    expect(formatRelative(new Date('2026-10-30T17:30:00Z'), new Date('2026-10-31T18:00:00Z'))).toBe('Hôm qua'))
  it('older date', () => expect(formatRelative(new Date('2026-10-28T10:00:00Z'), now)).toBe('28/10'))
})

describe('formatDayLabel', () => {
  it('today', () => expect(formatDayLabel(ago(3600_000), now)).toBe('Hôm nay'))
  it('yesterday', () => expect(formatDayLabel(new Date('2026-10-30T10:00:00Z'), now)).toBe('Hôm qua'))
  it('older', () => expect(formatDayLabel(new Date('2026-10-28T10:00:00Z'), now)).toBe('28/10'))
})
