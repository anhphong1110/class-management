import { describe, expect, it } from 'vitest'
import { brandLines, brandSentence, brandTitle, schoolLabel } from '@/lib/classes/brand'

describe('brandTitle', () => {
  it('Năm 8 (5/8)', () => expect(brandTitle({ class_name: 'Năm 8 (5/8)' })).toBe('TRẠM KHÔNG GIAN NĂM 8'))
  it('Năm 9 (6/2)', () => expect(brandTitle({ class_name: 'Năm 9 (6/2)' })).toBe('TRẠM KHÔNG GIAN NĂM 9'))
  it('không khớp mẫu Năm N', () => {
    expect(brandTitle({ class_name: 'Lớp Sao' })).toBe('TRẠM KHÔNG GIAN')
    expect(brandTitle({ class_name: '' })).toBe('TRẠM KHÔNG GIAN')
  })
  it('bỏ qua hoa thường và khoảng trắng thừa', () => {
    expect(brandTitle({ class_name: '  năm 12 (3/1)' })).toBe('TRẠM KHÔNG GIAN NĂM 12')
  })
})

describe('brandLines / brandSentence', () => {
  it('tách hai dòng cho thanh bên', () => {
    expect(brandLines({ class_name: 'Năm 8 (5/8)' })).toEqual({ top: 'TRẠM KHÔNG GIAN', accent: 'NĂM 8' })
    expect(brandLines({ class_name: 'Lớp Sao' })).toEqual({ top: 'TRẠM KHÔNG GIAN', accent: '' })
  })
  it('câu thường', () => {
    expect(brandSentence({ class_name: 'Năm 8 (5/8)' })).toBe('Trạm không gian Năm 8')
    expect(brandSentence({ class_name: 'Lớp Sao' })).toBe('Trạm không gian')
  })
})

describe('schoolLabel', () => {
  it('có tên thì thêm "Trường"', () => expect(schoolLabel(' Tiểu học Chính Nghĩa ')).toBe('Trường Tiểu học Chính Nghĩa'))
  it('trống thì "Trường học"', () => {
    expect(schoolLabel('')).toBe('Trường học')
    expect(schoolLabel(null)).toBe('Trường học')
  })
})
