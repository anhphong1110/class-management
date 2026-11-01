'use server'

import { z } from 'zod'
import { requireTeacher } from '@/lib/auth/session'
import { toVietnameseMessage } from '@/lib/errors'
import { buildReportCsv, buildReportWorkbook, reportFileName } from '@/lib/reports/export'
import { loadReport } from '@/lib/reports/queries'

const input = z.object({
  period: z.enum(['week', 'month', 'term', 'year', 'custom']),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
  format: z.enum(['csv', 'xlsx']),
})

export type ExportResult = { error?: string; fileName?: string; mime?: string; base64?: string }

const CSV_MIME = 'text/csv;charset=utf-8'
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function exportReport(raw: z.input<typeof input>): Promise<ExportResult> {
  const user = await requireTeacher()
  const parsed = input.safeParse(raw)
  if (!parsed.success) return { error: toVietnameseMessage('invalid_input') }
  const { period, from, to, format } = parsed.data
  const loaded = await loadReport(user.classId, period, { from, to })
  if (loaded.error !== undefined) return { error: loaded.error }
  const { range, data } = loaded
  const fileName = reportFileName(period === 'custom' ? 'Chọn ngày' : range.name, range.from, range.to, format)
  if (format === 'csv') {
    return { fileName, mime: CSV_MIME, base64: Buffer.from(buildReportCsv(data, range.name), 'utf8').toString('base64') }
  }
  return { fileName, mime: XLSX_MIME, base64: Buffer.from(buildReportWorkbook(data, range.name)).toString('base64') }
}
