import { normalizeVn } from '@/lib/domain/vn-text'

/** tram-sao-luu-<slug lớp>-<yyyy-mm-dd>.json (chỉ ký tự ASCII để dùng thẳng trong header). */
export function backupFileName(className: string, date: string): string {
  const slug = normalizeVn(className).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'lop'
  return `tram-sao-luu-${slug}-${date}.json`
}
