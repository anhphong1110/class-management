import * as XLSX from 'xlsx'
import { normalizeVn } from '@/lib/domain/vn-text'

export type ExportRow = { code: string; rollNo: number; fullName: string; groupName: string; competition: number; available: number }

export const TEMPLATE_HEADER = ['Số thứ tự', 'Họ và tên', 'Mã học sinh']

export function buildStudentWorkbook(rows: ExportRow[]): ArrayBuffer {
  const aoa = [
    ['Mã học sinh', 'Số thứ tự', 'Họ và tên', 'Tổ', 'Sao thi đua', 'Sao khả dụng'],
    ...rows.map((r) => [r.code, r.rollNo, r.fullName, r.groupName, r.competition, r.available]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Học sinh')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

/** "5/8" -> "5-8"; "Lớp 5A" -> "5a"; không còn ký tự nào thì "lop". */
export function classSlug(classShort: string): string {
  const slug = normalizeVn(classShort)
    .replace(/[\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/^lop(-|$)/, '')
    .replace(/^-|-$/g, '')
  return slug || 'lop'
}

/** "5/8" -> "danh-sach-hoc-sinh-lop-5-8.xlsx"; "Lớp 5A" -> "...-lop-5a.xlsx"; không còn ký tự nào thì "lop". */
export function exportFileName(classShort: string): string {
  return `danh-sach-hoc-sinh-lop-${classSlug(classShort)}.xlsx`
}

export function buildTemplateWorkbook(): ArrayBuffer {
  // Trang dữ liệu chỉ có dòng tiêu đề để file mẫu không nhập nhầm dòng ví dụ.
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADER])
  ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }]
  const guide = XLSX.utils.aoa_to_sheet([
    ['Hướng dẫn nhập danh sách học sinh'],
    ['Nhập học sinh ở trang "Danh sách", mỗi học sinh một dòng, bắt đầu từ dòng 2. Chỉ trang đầu tiên được đọc.'],
    ['Họ và tên là bắt buộc. Số thứ tự và Mã học sinh có thể để trống, hệ thống sẽ tự điền.'],
    [],
    TEMPLATE_HEADER,
    [11, 'Nguyễn Văn A', ''],
    [12, 'Trần Thị B', ''],
  ])
  guide['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách')
  XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
