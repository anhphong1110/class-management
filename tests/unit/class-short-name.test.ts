import { describe, expect, it } from 'vitest'
import { classShortName, termRoman } from '@/lib/classes/short-name'

describe('classShortName', () => {
  it('lấy phần trong ngoặc', () => expect(classShortName('Năm 8 (5/8)')).toBe('5/8'))
  it('không ngoặc thì giữ nguyên', () => expect(classShortName('Lớp 5A')).toBe('Lớp 5A'))
})
describe('termRoman', () => {
  it('trước học kỳ 2 là I', () => expect(termRoman('2027-01-18', new Date('2026-11-01T00:00:00Z'))).toBe('I'))
  it('từ ngày học kỳ 2 là II', () => expect(termRoman('2027-01-18', new Date('2027-02-01T00:00:00Z'))).toBe('II'))
  it('thiếu ngày thì I', () => expect(termRoman(null, new Date())).toBe('I'))
})
