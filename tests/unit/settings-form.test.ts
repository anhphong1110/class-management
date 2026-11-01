import { describe, expect, it } from 'vitest'
import { addStep, infoPayload, parseStepInput, removeStep } from '@/lib/settings/form'

describe('parseStepInput', () => {
  it('chỉ nhận số nguyên dương', () => {
    expect(parseStepInput('7')).toBe(7)
    expect(parseStepInput(' 12 ')).toBe(12)
    expect(parseStepInput('')).toBeNull()
    expect(parseStepInput('0')).toBeNull()
    expect(parseStepInput('-3')).toBeNull()
    expect(parseStepInput('2.5')).toBeNull()
    expect(parseStepInput('abc')).toBeNull()
  })
})

describe('addStep / removeStep', () => {
  it('thêm đúng số nhập, sắp xếp, không trùng', () => {
    expect(addStep([1, 2, 3, 5, 10], 7)).toEqual([1, 2, 3, 5, 7, 10])
    expect(addStep([1, 2], 2)).toEqual([1, 2])
  })
  it('xóa một mức', () => {
    expect(removeStep([1, 2, 3], 2)).toEqual([1, 3])
  })
})

describe('infoPayload', () => {
  it('ô ngày trống thành null, chuỗi giữ nguyên', () => {
    const p = infoPayload({
      school_name: 'A', class_name: 'B', school_year: 'C', teacher_name: 'D', slogan: '',
      term1_start: '2026-09-05', term1_end: '', term2_start: '', term2_end: '2027-05-31',
    })
    expect(p.term1_end).toBeNull()
    expect(p.term2_start).toBeNull()
    expect(p.term1_start).toBe('2026-09-05')
    expect(p.slogan).toBe('')
  })
})
