import { describe, expect, it } from 'vitest'
import { countUsed } from '@/lib/timetable/used'
import { subjectNameSchema } from '@/lib/timetable/subject-name'

const slots = [
  { weekday: 1, subject_id: 'a' },
  { weekday: 6, subject_id: 'a' },
  { weekday: 6, subject_id: 'b' },
  { weekday: 2, subject_id: null },
]

describe('countUsed', () => {
  it('thứ Bảy tắt: không đếm tiết thứ Bảy', () => {
    const m = countUsed(slots, false)
    expect(m.get('a')).toBe(1)
    expect(m.has('b')).toBe(false)
  })
  it('thứ Bảy bật: đếm đủ', () => {
    const m = countUsed(slots, true)
    expect(m.get('a')).toBe(2)
    expect(m.get('b')).toBe(1)
  })
})

describe('subjectNameSchema', () => {
  it('chuẩn hóa NFC và cắt khoảng trắng', () => {
    const decomposed = 'Toa\u0301n' // "Toán" gõ rời dấu
    const r = subjectNameSchema.parse(`  ${decomposed} `)
    expect(r).toBe('Toán')
    expect(r).toHaveLength(4)
  })
  it('từ chối rỗng và quá 40 ký tự', () => {
    expect(subjectNameSchema.safeParse('   ').success).toBe(false)
    expect(subjectNameSchema.safeParse('a'.repeat(41)).success).toBe(false)
  })
})
