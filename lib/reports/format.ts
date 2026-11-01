import type { Bucket, ReportSummary } from './types'

/** Thẻ KPI: nhãn và màu chữ chép từ thiết kế Reports. */
export function kpiCards(k: ReportSummary['kpis']): { label: string; value: string; n: number; color: string }[] {
  return [
    { label: 'Sao đã cộng', value: `+${k.added}`, n: k.added, color: '#2C37A8' },
    { label: 'Sao đã trừ', value: `-${k.deducted}`, n: k.deducted, color: '#8E1B3B' },
    { label: 'Tỉ lệ chuyên cần', value: `${k.attendancePct}%`, n: k.attendancePct, color: '#0B5A4D' },
    { label: 'Lượt đổi quà', value: String(k.redeemed), n: k.redeemed, color: '#5E35B1' },
    { label: 'Học sinh tiến bộ', value: String(k.improved), n: k.improved, color: '#7A4E00' },
  ]
}

export function unitLabel(bucket: Bucket): string {
  return bucket === 'day' ? 'ngày' : bucket === 'week' ? 'tuần' : 'tháng'
}

/** `2026-03-02` -> `02/03/2026`. */
export function viDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}
