import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { SUBJECT_PALETTE, nextInk, paletteFor } from '@/lib/timetable/palette'
import { buildTimetableWorkbook, timetableFileName } from '@/lib/timetable/export'

describe('palette', () => {
  it('có 11 cặp [nền, chữ] của thiết kế', () => {
    expect(SUBJECT_PALETTE).toHaveLength(11)
    expect(SUBJECT_PALETTE[0]).toEqual({ bg: '#E8EBFF', ink: '#2C37A8' })
    expect(SUBJECT_PALETTE[10]).toEqual({ bg: '#EDEDF7', ink: '#3A3769' })
  })
  it('paletteFor tra theo màu chữ, không thấy thì cặp cuối', () => {
    expect(paletteFor('#8E1B3B')).toEqual({ bg: '#FFE3EE', ink: '#8E1B3B' })
    expect(paletteFor('#000000')).toEqual(SUBJECT_PALETTE[10])
  })
  it('nextInk đi vòng', () => {
    expect(nextInk('#2C37A8')).toBe('#8E1B3B')
    expect(nextInk('#3A3769')).toBe('#2C37A8')
  })
})

describe('buildTimetableWorkbook', () => {
  const subjects = [{ id: 'a', name: 'Toán học' }, { id: 'b', name: 'Tiếng Việt' }]
  const slots = { '1-morning-1': 'a', '2-afternoon-3': 'b', '1-morning-2': null }
  function rows(saturday: boolean) {
    const wb = XLSX.read(buildTimetableWorkbook({ saturday, slots, subjects }), { type: 'array' })
    expect(wb.SheetNames).toEqual(['Thời khóa biểu'])
    return XLSX.utils.sheet_to_json<string[]>(wb.Sheets['Thời khóa biểu'], { header: 1, defval: '' })
  }
  it('hàng tiết x cột thứ, tách buổi sáng và chiều', () => {
    const r = rows(false)
    expect(r[0]).toEqual(['Tiết', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'])
    expect(r[1][0]).toBe('BUỔI SÁNG')
    expect(r[2]).toEqual(['Tiết 1', 'Toán học', '', '', '', ''])
    expect(r[7][0]).toBe('BUỔI CHIỀU')
    expect(r[10]).toEqual(['Tiết 3', '', 'Tiếng Việt', '', '', ''])
    expect(r).toHaveLength(11)
  })
  it('thêm cột Thứ Bảy khi bật', () => {
    expect(rows(true)[0]).toHaveLength(7)
  })
  it('tên file theo lớp', () => {
    expect(timetableFileName('5/8')).toBe('thoi-khoa-bieu-lop-5-8.xlsx')
  })
})
