import { describe, expect, it } from 'vitest'
import { formatVietnameseDate, todayInVietnam } from '@/lib/domain/date'

describe('date', () => {
  it('định dạng ngày theo giờ Việt Nam', () => {
    expect(formatVietnameseDate(new Date('2026-10-31T03:00:00Z'))).toBe('Thứ Bảy, 31/10/2026')
  })
  it('23:30 UTC đã là ngày hôm sau ở Việt Nam', () => {
    expect(formatVietnameseDate(new Date('2026-10-31T23:30:00Z'))).toBe('Chủ Nhật, 01/11/2026')
    expect(todayInVietnam(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01')
  })
})
