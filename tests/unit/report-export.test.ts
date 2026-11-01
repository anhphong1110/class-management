import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildReportCsv, buildReportWorkbook, reportFileName } from '@/lib/reports/export'
import { kpiCards, unitLabel } from '@/lib/reports/format'
import type { ReportData } from '@/lib/reports/types'

const data: ReportData = {
  from: '2026-03-02',
  to: '2026-03-08',
  bucket: 'day',
  kpis: { added: 12, deducted: 2, attendancePct: 50, redeemed: 3, improved: 2 },
  buckets: [{ label: 'Thứ 2', added: 5, deducted: 0 }, { label: 'Thứ 3', added: 0, deducted: 2 }],
  attendance: { present: 38, late: 12, excused: 25, unexcused: 25 },
  lowAttendance: [{ name: '=HYPERLINK("x")', days: 3 }],
  criteria: [{ label: 'Phát biểu, xây dựng', kind: 'award', n: 2 }, { label: 'Quên đồ', kind: 'penalty', n: 1 }],
  progress: [{ studentId: 'a1', name: 'Nguyễn Minh Anh', avatarId: null, up: 5 }],
  gifts: [{ label: 'Bút', n: 2 }],
}
const empty: ReportData = {
  ...data,
  kpis: { added: 0, deducted: 0, attendancePct: 0, redeemed: 0, improved: 0 },
  buckets: [{ label: 'Thứ 2', added: 0, deducted: 0 }],
  attendance: { present: 0, late: 0, excused: 0, unexcused: 0 },
  lowAttendance: [], criteria: [], progress: [], gifts: [],
}

describe('buildReportCsv', () => {
  const csv = buildReportCsv(data, 'Tuần này')
  it('bắt đầu bằng BOM UTF-8 và dùng CRLF', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('\r\n')
    expect(csv).not.toMatch(/[^\r]\n/)
  })
  it('chặn ô bắt đầu bằng = bằng dấu nháy đơn', () => {
    expect(csv).toContain(`'=HYPERLINK(""x"")`)
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m)
  })
  it('bọc dấu phẩy trong ngoặc kép', () => {
    expect(csv).toContain('"Phát biểu, xây dựng"')
  })
  it('có tên kỳ, ngày, KPI và các khối', () => {
    expect(csv).toContain('Tuần này')
    expect(csv).toContain('02/03/2026')
    expect(csv).toContain('Sao đã cộng,12')
    for (const t of ['Theo thời gian', 'Chuyên cần', 'Tiêu chí', 'Tiến bộ', 'Đổi quà']) expect(csv).toContain(t)
  })
  it('kỳ trống: không có NaN/Infinity/undefined', () => {
    const e = buildReportCsv(empty, 'Tuần này')
    expect(e).toContain('Sao đã cộng,0')
    expect(e).not.toMatch(/NaN|Infinity|undefined|null/)
  })
})

describe('buildReportWorkbook', () => {
  it('mỗi khối một sheet theo đúng tên và thứ tự', () => {
    const wb = XLSX.read(buildReportWorkbook(data, 'Tuần này'), { type: 'array' })
    expect(wb.SheetNames).toEqual(['KPI', 'Theo thời gian', 'Chuyên cần', 'Tiêu chí', 'Tiến bộ', 'Đổi quà'])
  })
  it('kỳ trống vẫn có đủ sheet và không có NaN', () => {
    const wb = XLSX.read(buildReportWorkbook(empty, 'Tuần này'), { type: 'array' })
    expect(wb.SheetNames).toHaveLength(6)
    const kpi = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['KPI'], { header: 1 })
    expect(JSON.stringify(kpi)).not.toMatch(/NaN|Infinity/)
  })
})

describe('reportFileName', () => {
  it('bao-cao-<slug tên kỳ>-<from>-<to>', () => {
    expect(reportFileName('Tuần này', '2026-03-02', '2026-03-08', 'csv')).toBe('bao-cao-tuan-nay-2026-03-02-2026-03-08.csv')
    expect(reportFileName('Học kỳ', '2026-09-05', '2027-01-15', 'xlsx')).toBe('bao-cao-hoc-ky-2026-09-05-2027-01-15.xlsx')
    expect(reportFileName('Từ 05/03/2026 đến 06/03/2026', '2026-03-05', '2026-03-06', 'csv')).toBe(
      'bao-cao-tu-05-03-2026-den-06-03-2026-2026-03-05-2026-03-06.csv',
    )
  })
})

describe('format', () => {
  it('thẻ KPI theo thiết kế, kỳ trống toàn 0', () => {
    expect(kpiCards(data.kpis).map((k) => [k.label, k.value])).toEqual([
      ['Sao đã cộng', '+12'], ['Sao đã trừ', '-2'], ['Tỉ lệ chuyên cần', '50%'], ['Lượt đổi quà', '3'], ['Học sinh tiến bộ', '2'],
    ])
    expect(kpiCards(empty.kpis).map((k) => k.value)).toEqual(['+0', '-0', '0%', '0', '0'])
  })
  it('đơn vị của biểu đồ', () => {
    expect([unitLabel('day'), unitLabel('week'), unitLabel('month')]).toEqual(['ngày', 'tuần', 'tháng'])
  })
})
