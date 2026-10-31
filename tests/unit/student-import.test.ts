import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseStudentSheet } from '@/lib/students/import'
import { classShortName } from '@/lib/classes/short-name'
import { buildStudentWorkbook, exportFileName } from '@/lib/students/export'

const enc = (s: string, bom = false) => {
  const body = new TextEncoder().encode(s)
  if (!bom) return body.buffer as ArrayBuffer
  const out = new Uint8Array(body.length + 3)
  out.set([0xef, 0xbb, 0xbf])
  out.set(body, 3)
  return out.buffer as ArrayBuffer
}
const existing = new Set(Array.from({ length: 10 }, (_, i) => `HS${String(i + 1).padStart(2, '0')}`))
const CSV = 'Số thứ tự,Họ và tên,Mã học sinh\n11,Lý Thu Hà,\n,,\n12,,HS20\nx,Mai Lan,HS01\n13,Tô Gia Huy,HS21\n14,Đào Minh,HS21'

describe('parseStudentSheet', () => {
  it('đọc CSV, bỏ dòng trống, báo lỗi theo thứ tự tên, số thứ tự, mã', () => {
    const { rows } = parseStudentSheet(enc(CSV), existing)
    expect(rows.map((r) => [r.line, r.error])).toEqual([
      [2, null],
      [4, 'Thiếu họ và tên'],
      [5, 'Số thứ tự không hợp lệ'],
      [6, null],
      [7, 'Mã bị trùng trong file'],
    ])
    expect(rows[0]).toMatchObject({ rollNo: 11, fullName: 'Lý Thu Hà', code: null })
    expect(rows[3]).toMatchObject({ rollNo: 13, fullName: 'Tô Gia Huy', code: 'HS21' })
  })

  it('báo mã đã có trong lớp', () => {
    const { rows } = parseStudentSheet(enc('Họ và tên,Mã học sinh\nAn,HS03'), existing)
    expect(rows[0].error).toBe('Mã đã có trong lớp')
  })

  it('đọc file có BOM', () => {
    const { rows } = parseStudentSheet(enc(CSV, true), existing)
    expect(rows[0]).toMatchObject({ rollNo: 11, fullName: 'Lý Thu Hà', error: null })
  })

  it('ném lỗi khi thiếu cột họ và tên', () => {
    expect(() => parseStudentSheet(enc('Số thứ tự,Mã học sinh\n1,HS01'), existing)).toThrow('missing_name_column')
  })

  it('đọc file xlsx', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Số thứ tự', 'Họ và tên', 'Mã học sinh'], [5, 'Bé Na', null]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const { rows } = parseStudentSheet(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer, existing)
    expect(rows).toEqual([{ line: 2, rollNo: 5, fullName: 'Bé Na', code: null, error: null }])
  })
})

describe('parse bổ sung', () => {
  it('mã trùng mã đã lưu trữ (có trong existing) bị báo, mã chuẩn hóa chữ hoa', () => {
    const { rows } = parseStudentSheet(enc('Họ và tên,Mã học sinh\nAn, hs11 \nBình,HS11'), new Set([...existing, 'HS11']))
    expect(rows.map((r) => [r.code, r.error])).toEqual([
      ['HS11', 'Mã đã có trong lớp'],
      ['HS11', 'Mã đã có trong lớp'],
    ])
  })

  it('đọc CSV windows-1258 khi không phải UTF-8', () => {
    // "Họ và tên" bằng windows-1258: ọ = o + dấu nặng (U+0323 -> 0xF2), à = 0xE0
    const bytes = new Uint8Array([0x48, 0x6f, 0xf2, 0x20, 0x76, 0xe0, 0x20, 0x74, 0xea, 0x6e, 0x0a, 0x41, 0x6e])
    const { rows } = parseStudentSheet(bytes.buffer, existing)
    expect(rows).toHaveLength(1)
    expect(rows[0].fullName).toBe('An')
  })

  it('chuẩn hóa NFC cho tên', () => {
    const { rows } = parseStudentSheet(enc('Họ và tên\nLy\u0301 Thu Ha\u0323'), existing)
    expect(rows[0].fullName).toBe('Lý Thu Hạ')
  })
})

describe('exportFileName', () => {
  it.each([
    ['Năm 8 (5/8)', 'danh-sach-hoc-sinh-lop-5-8.xlsx'],
    ['Lớp 5A', 'danh-sach-hoc-sinh-lop-5a.xlsx'],
    ['5A - Chiều', 'danh-sach-hoc-sinh-lop-5a-chieu.xlsx'],
    ['***', 'danh-sach-hoc-sinh-lop-lop.xlsx'],
  ])('%s', (name, expected) => {
    expect(exportFileName(classShortName(name))).toBe(expected)
  })
})

describe('buildStudentWorkbook', () => {
  it('ghi đúng tiêu đề và giá trị', () => {
    const buf = buildStudentWorkbook([{ code: 'HS01', rollNo: 1, fullName: 'Nguyễn Minh Anh', groupName: 'Tổ 1', competition: 12, available: 7 }])
    const wb = XLSX.read(buf, { type: 'array' })
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })
    expect(aoa).toEqual([
      ['Mã học sinh', 'Số thứ tự', 'Họ và tên', 'Tổ', 'Sao thi đua', 'Sao khả dụng'],
      ['HS01', 1, 'Nguyễn Minh Anh', 'Tổ 1', 12, 7],
    ])
  })
})
