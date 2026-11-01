import { describe, expect, it } from 'vitest'
import { COPY_OPTIONS, DEFAULT_COPY, nextSchoolYear } from '@/lib/backup/year'

describe('nextSchoolYear', () => {
  it('tăng cả hai năm và giữ dấu gạch dài', () => {
    expect(nextSchoolYear('2026 – 2027')).toBe('2027 – 2028')
    expect(nextSchoolYear('2026-2027')).toBe('2027 – 2028')
  })
  it('không đọc được thì trả rỗng', () => {
    expect(nextSchoolYear('')).toBe('')
    expect(nextSchoolYear('Năm học này')).toBe('')
  })
})

describe('DEFAULT_COPY', () => {
  it('chọn hết trừ Thời khóa biểu', () => {
    expect(DEFAULT_COPY).not.toContain('timetable')
    expect(DEFAULT_COPY).toHaveLength(COPY_OPTIONS.length - 1)
  })
})
