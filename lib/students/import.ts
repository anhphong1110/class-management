import * as XLSX from 'xlsx'
import { normalizeVn } from '@/lib/domain/vn-text'

export type ImportRow = { line: number; rollNo: number | null; fullName: string; code: string | null; error: string | null }

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_ROWS = 500

/** Chỉ chạy được ở trình duyệt lẫn máy chủ: không import gì chỉ dành cho server. */
function readSheet(data: ArrayBuffer): unknown[][] {
  const head = new Uint8Array(data.slice(0, 4))
  const isZip = head[0] === 0x50 && head[1] === 0x4b
  const isOle = head[0] === 0xd0 && head[1] === 0xcf
  // CSV: giải mã UTF-8 (TextDecoder bỏ BOM) rồi đọc dạng chuỗi để không hỏng dấu tiếng Việt.
  const wb = isZip || isOle ? XLSX.read(data, { type: 'array' }) : XLSX.read(new TextDecoder('utf-8').decode(data), { type: 'string' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: true })
}

const text = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim())

export function parseStudentSheet(data: ArrayBuffer, existingCodes: Set<string>): { rows: ImportRow[] } {
  const grid = readSheet(data)
  const header = (grid[0] ?? []).map((h) => normalizeVn(text(h)).replace(/\s+/g, ' '))
  const nameCol = header.indexOf('ho va ten')
  if (nameCol < 0) throw new Error('missing_name_column')
  const rollCol = header.indexOf('so thu tu')
  const codeCol = header.indexOf('ma hoc sinh')

  const seen = new Set<string>()
  const rows: ImportRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i] ?? []
    if (cells.every((c) => text(c) === '')) continue
    const fullName = text(cells[nameCol])
    const rollText = rollCol >= 0 ? text(cells[rollCol]) : ''
    const code = (codeCol >= 0 ? text(cells[codeCol]) : '') || null

    let rollNo: number | null = null
    let error: string | null = null
    if (!fullName || fullName.length > 200) error = 'Thiếu họ và tên'
    if (rollText !== '') {
      const n = Number(rollText)
      if (Number.isInteger(n) && n >= 1 && n <= 9999) rollNo = n
      else error ??= 'Số thứ tự không hợp lệ'
    }
    if (code) {
      if (existingCodes.has(code)) error ??= 'Mã đã có trong lớp'
      else if (seen.has(code)) error ??= 'Mã bị trùng trong file'
    }
    if (code && !error) seen.add(code)
    rows.push({ line: i + 1, rollNo, fullName, code, error })
  }
  return { rows }
}
