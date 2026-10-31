import { describe, expect, it } from 'vitest'
import { formatVietnameseDate, todayInVietnam, weekdayInVietnam } from '@/lib/domain/date'

describe('date', () => {
  it('định dạng ngày theo giờ Việt Nam', () => {
    expect(formatVietnameseDate(new Date('2026-10-31T03:00:00Z'))).toBe('Thứ Bảy, 31/10/2026')
  })
  it('23:30 UTC đã là ngày hôm sau ở Việt Nam', () => {
    expect(formatVietnameseDate(new Date('2026-10-31T23:30:00Z'))).toBe('Chủ Nhật, 01/11/2026')
    expect(todayInVietnam(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01')
  })
  it('weekdayInVietnam theo ranh giới UTC/VN', () => {
    expect(weekdayInVietnam(new Date('2026-11-01T17:30:00Z'))).toBe(1) // Thứ Hai ở VN
    expect(weekdayInVietnam(new Date('2026-11-06T16:59:00Z'))).toBe(5) // Thứ Sáu
    expect(weekdayInVietnam(new Date('2026-11-06T17:00:00Z'))).toBe(6) // Thứ Bảy
    expect(weekdayInVietnam(new Date('2026-10-31T17:00:00Z'))).toBe(0) // Chủ Nhật
  })
})
