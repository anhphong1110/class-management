import { describe, expect, it } from 'vitest'
import { buildMonthCsv } from '@/lib/attendance/csv'

const students = [
  { code: 'HS01', fullName: 'Nguyễn Minh Anh' },
  { code: 'HS02', fullName: 'Trần, "Gia" Bảo' },
]
const days = ['2026-10-29', '2026-10-30', '2026-10-31']
const cells = {
  HS01: { '2026-10-29': 'present', '2026-10-30': 'late', '2026-10-31': 'absent_excused' },
  HS02: { '2026-10-29': 'absent_unexcused', '2026-10-30': 'present' },
} as const

describe('buildMonthCsv', () => {
  const csv = buildMonthCsv(students, days, cells as never)
  const lines = csv.replace(/^﻿/, '').split('\r\n')

  it('bắt đầu bằng BOM UTF-8', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })
  it('tiêu đề đúng thứ tự cột', () => {
    expect(lines[0]).toBe('Mã học sinh,Họ và tên,29/10,30/10,31/10,Có mặt,Vắng không phép,Vắng có phép,Đi trễ')
  })
  it('ô dùng ký hiệu C K P T và để trống khi chưa điểm danh', () => {
    expect(lines[1]).toBe('HS01,Nguyễn Minh Anh,C,T,P,1,0,1,1')
    expect(lines[2]).toBe('HS02,"Trần, ""Gia"" Bảo",K,C,,1,1,0,0')
  })
  it('có dòng cuối rỗng sau mỗi dòng dữ liệu', () => {
    expect(lines.length).toBe(4)
    expect(lines[3]).toBe('')
  })

  it('chặn công thức: thêm dấu nháy trước = + - @', () => {
    const out = buildMonthCsv(
      [
        { code: 'HS03', fullName: '=HYPERLINK("x")' },
        { code: '+1', fullName: '-Anh' },
        { code: '@x', fullName: 'Bình' },
      ],
      [],
      {},
    )
      .replace(/^\uFEFF/, '')
      .split('\r\n')
    expect(out[1]).toBe('HS03,"\'=HYPERLINK(""x"")",0,0,0,0')
    expect(out[2]).toBe("'+1,'-Anh,0,0,0,0")
    expect(out[3]).toBe("'@x,Bình,0,0,0,0")
  })
})
