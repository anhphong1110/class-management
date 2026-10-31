import { describe, expect, it } from 'vitest'
import { buildHighlight, buildTodayLessons, nextBlockIndex, selectDisplayWeekday } from '@/lib/display/logic'

describe('buildHighlight', () => {
  it('có tổ dẫn đầu', () => {
    expect(buildHighlight(86, 'Tổ 1')).toBe('Cả lớp đạt 86 sao thi đua trong tuần. Tổ 1 dẫn đầu.')
  })
  it('bỏ câu sau khi không có tổ nào', () => {
    expect(buildHighlight(0, null)).toBe('Cả lớp đạt 0 sao thi đua trong tuần.')
  })
})

describe('selectDisplayWeekday (giờ Việt Nam)', () => {
  // 2026-11-01 là Chủ Nhật, 2026-10-31 là Thứ Bảy, 2026-10-30 là Thứ Sáu.
  it('Chủ Nhật không có tiết', () => {
    expect(selectDisplayWeekday(new Date('2026-11-01T03:00:00Z'), true)).toBeNull()
    expect(selectDisplayWeekday(new Date('2026-11-01T03:00:00Z'), false)).toBeNull()
  })
  it('Thứ Bảy tắt thì rỗng, bật thì 6', () => {
    expect(selectDisplayWeekday(new Date('2026-10-31T03:00:00Z'), false)).toBeNull()
    expect(selectDisplayWeekday(new Date('2026-10-31T03:00:00Z'), true)).toBe(6)
  })
  it('ngày thường trả đúng thứ', () => {
    expect(selectDisplayWeekday(new Date('2026-10-30T03:00:00Z'), false)).toBe(5)
    expect(selectDisplayWeekday(new Date('2026-10-26T03:00:00Z'), false)).toBe(1)
  })
  it('qua nửa đêm giờ Việt Nam thì sang ngày mới', () => {
    // 16:59 UTC = 23:59 thứ Sáu; 17:00 UTC = 00:00 thứ Bảy
    expect(selectDisplayWeekday(new Date('2026-10-30T16:59:00Z'), true)).toBe(5)
    expect(selectDisplayWeekday(new Date('2026-10-30T17:00:00Z'), true)).toBe(6)
    expect(selectDisplayWeekday(new Date('2026-10-30T17:00:00Z'), false)).toBeNull()
  })
})

describe('nextBlockIndex', () => {
  it('đi vòng qua 5 khối', () => {
    expect(nextBlockIndex(0)).toBe(1)
    expect(nextBlockIndex(4)).toBe(0)
  })
  it('đi vòng theo số khối đang hiện', () => {
    expect(nextBlockIndex(3, 4)).toBe(0)
  })
})

describe('buildTodayLessons', () => {
  const subjects = [
    { id: 'toan', name: 'Toán', color: '#2C37A8' },
    { id: 'tv', name: 'Tiếng Việt', color: '#8E1B3B' },
  ]
  // Thứ Sáu = 5; thứ Bảy = 6
  const slots = {
    '5-morning-1': 'toan',
    '5-morning-2': null,
    '5-morning-4': 'tv',
    '5-afternoon-2': 'toan',
    '5-afternoon-3': 'gone',
    '6-morning-1': 'tv',
    '1-morning-1': 'toan',
  }
  const friday = new Date('2026-10-30T03:00:00Z')
  const saturday = new Date('2026-10-31T03:00:00Z')
  const sunday = new Date('2026-11-01T03:00:00Z')

  it('ngày thường: sáng rồi chiều, bỏ ô trống và môn đã mất, màu theo môn', () => {
    expect(buildTodayLessons(slots, subjects, friday, false)).toEqual([
      { label: 'Tiết 1', subject: 'Toán', bg: '#E8EBFF', ink: '#2C37A8' },
      { label: 'Tiết 4', subject: 'Tiếng Việt', bg: '#FFE3EE', ink: '#8E1B3B' },
      { label: 'Chiều · Tiết 2', subject: 'Toán', bg: '#E8EBFF', ink: '#2C37A8' },
    ])
  })
  it('thứ Bảy tắt thì rỗng, bật thì có tiết', () => {
    expect(buildTodayLessons(slots, subjects, saturday, false)).toEqual([])
    expect(buildTodayLessons(slots, subjects, saturday, true)).toEqual([
      { label: 'Tiết 1', subject: 'Tiếng Việt', bg: '#FFE3EE', ink: '#8E1B3B' },
    ])
  })
  it('Chủ Nhật rỗng dù bật thứ Bảy', () => {
    expect(buildTodayLessons(slots, subjects, sunday, true)).toEqual([])
    expect(buildTodayLessons(slots, subjects, sunday, false)).toEqual([])
  })
  it('ngày không có tiết nào thì rỗng', () => {
    expect(buildTodayLessons({}, subjects, friday, false)).toEqual([])
  })
})
