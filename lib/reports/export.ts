import * as XLSX from 'xlsx'
import { field, safe } from '@/lib/attendance/csv'
import { normalizeVn } from '@/lib/domain/vn-text'
import { kpiCards, viDate } from './format'
import type { ReportData } from './types'

type Cell = string | number
type Block = { sheet: string; rows: Cell[][] }

const KIND_LABEL = { award: 'Cộng', penalty: 'Trừ' } as const

/** Các khối dùng chung cho CSV (nối tiếp) và Excel (mỗi khối một sheet). */
function blocks(d: ReportData): Block[] {
  return [
    {
      sheet: 'KPI',
      rows: [['Chỉ số', 'Giá trị'], ...kpiCards(d.kpis).map((k) => [k.label === 'Tỉ lệ chuyên cần' ? 'Tỉ lệ chuyên cần (%)' : k.label, k.n])],
    },
    {
      sheet: 'Theo thời gian',
      rows: [['Mốc', 'Sao cộng', 'Sao trừ'], ...d.buckets.map((b) => [b.label, b.added, b.deducted])],
    },
    {
      sheet: 'Chuyên cần',
      rows: [
        ['Trạng thái', 'Tỉ lệ (%)'],
        ['Có mặt', d.attendance.present],
        ['Đi trễ', d.attendance.late],
        ['Vắng có phép', d.attendance.excused],
        ['Vắng không phép', d.attendance.unexcused],
        [],
        ['Cần quan tâm (vắng nhiều nhất)', 'Số buổi vắng'],
        ...d.lowAttendance.map((l) => [l.name, l.days]),
      ],
    },
    {
      sheet: 'Tiêu chí',
      rows: [['Tiêu chí', 'Loại', 'Số lần'], ...d.criteria.map((c) => [c.label, KIND_LABEL[c.kind], c.n])],
    },
    {
      sheet: 'Tiến bộ',
      rows: [['Học sinh', 'Sao tăng so với kỳ trước'], ...d.progress.map((p) => [p.name, p.up])],
    },
    {
      sheet: 'Đổi quà',
      rows: [['Quà', 'Lượt đổi'], ...d.gifts.map((g) => [g.label, g.n])],
    },
  ]
}

const csvLine = (cells: Cell[]) => cells.map((c) => field(typeof c === 'string' ? safe(c) : String(c))).join(',')

/** CSV UTF-8 có BOM; mỗi khối có dòng tiêu đề riêng, cách nhau một dòng trống. */
export function buildReportCsv(d: ReportData, name: string): string {
  const lines: string[] = [csvLine(['Báo cáo', name]), csvLine(['Từ ngày', viDate(d.from)]), csvLine(['Đến ngày', viDate(d.to)])]
  for (const b of blocks(d)) {
    lines.push('', csvLine([b.sheet]), ...b.rows.map(csvLine))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

export function buildReportWorkbook(d: ReportData, name: string): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const b of blocks(d)) {
    const head: Cell[][] = b.sheet === 'KPI' ? [['Báo cáo', name], ['Từ ngày', viDate(d.from)], ['Đến ngày', viDate(d.to)], []] : []
    const ws = XLSX.utils.aoa_to_sheet([...head, ...b.rows])
    ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, b.sheet)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function slug(text: string): string {
  return normalizeVn(text).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function reportFileName(name: string, from: string, to: string, ext: 'csv' | 'xlsx'): string {
  return `bao-cao-${slug(name)}-${from}-${to}.${ext}`
}
