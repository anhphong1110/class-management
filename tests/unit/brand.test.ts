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

describe('brand_title tùy chỉnh', () => {
  const cls = (brand_title: string | null) => ({ class_name: 'Năm 8 (5/8)', brand_title })

  it('ưu tiên brand_title, in hoa', () => {
    expect(brandTitle(cls('Trạm không gian Năm 9'))).toBe('TRẠM KHÔNG GIAN NĂM 9')
    expect(brandTitle(cls('Hành tinh Xanh'))).toBe('HÀNH TINH XANH')
  })
  it('trống hoặc null thì suy ra từ tên lớp như cũ', () => {
    expect(brandTitle(cls(null))).toBe('TRẠM KHÔNG GIAN NĂM 8')
    expect(brandTitle(cls('   '))).toBe('TRẠM KHÔNG GIAN NĂM 8')
    expect(brandTitle({ class_name: 'Năm 8 (5/8)' })).toBe('TRẠM KHÔNG GIAN NĂM 8')
  })
  it('tiền tố "Trạm không gian" thì phần còn lại là dòng nhấn', () => {
    expect(brandLines(cls('trạm không gian Năm 9'))).toEqual({ top: 'TRẠM KHÔNG GIAN', accent: 'NĂM 9' })
    expect(brandLines(cls('Trạm không gian'))).toEqual({ top: 'TRẠM KHÔNG GIAN', accent: '' })
  })
  it('tên khác hoàn toàn thì cả tên là dòng trên, không có dòng nhấn', () => {
    expect(brandLines(cls('Hành tinh Xanh'))).toEqual({ top: 'HÀNH TINH XANH', accent: '' })
  })
  it('câu thường giữ nguyên chữ cô gõ', () => {
    expect(brandSentence(cls('  Trạm không gian Năm 9 '))).toBe('Trạm không gian Năm 9')
    expect(brandSentence(cls('Hành tinh Xanh'))).toBe('Hành tinh Xanh')
    expect(brandSentence(cls(null))).toBe('Trạm không gian Năm 8')
  })
})

describe('schoolLabel', () => {
  it('có tên thì thêm "Trường"', () => expect(schoolLabel(' Tiểu học Chính Nghĩa ')).toBe('Trường Tiểu học Chính Nghĩa'))
  it('trống thì "Trường học"', () => {
    expect(schoolLabel('')).toBe('Trường học')
    expect(schoolLabel(null)).toBe('Trường học')
  })
})

describe('schoolLabel', () => {
  it('thêm chữ Trường', () => expect(schoolLabel('Tiểu học Chính Nghĩa')).toBe('Trường Tiểu học Chính Nghĩa'))
  it('không lặp chữ Trường', () => {
    expect(schoolLabel('Trường Tiểu học Chính Nghĩa')).toBe('Trường Tiểu học Chính Nghĩa')
    expect(schoolLabel('  TRƯỜNG Tiểu học A')).toBe('Trường Tiểu học A')
  })
  it('trống thì Trường học', () => expect(schoolLabel('')).toBe('Trường học'))
})
