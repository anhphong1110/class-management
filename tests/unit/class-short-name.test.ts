import { describe, expect, it } from 'vitest'
import { classShortName, termRoman } from '@/lib/classes/short-name'

describe('classShortName', () => {
  it('lấy phần trong ngoặc', () => expect(classShortName('Năm 8 (5/8)')).toBe('5/8'))
  it('không ngoặc thì giữ nguyên', () => expect(classShortName('Lớp 5A')).toBe('Lớp 5A'))
})
describe('termRoman', () => {
  it('1 -> I', () => expect(termRoman(1)).toBe('I'))
  it('2 -> II', () => expect(termRoman(2)).toBe('II'))
  it('null -> null', () => expect(termRoman(null)).toBeNull())
})
