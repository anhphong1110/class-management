export type Bucket = 'day' | 'week' | 'month'

/** Kết quả `public.report_summary`. */
export type ReportSummary = {
  kpis: { added: number; deducted: number; attendancePct: number; redeemed: number; improved: number }
  buckets: { label: string; added: number; deducted: number }[]
  attendance: { present: number; late: number; excused: number; unexcused: number }
  lowAttendance: { name: string; days: number }[]
  criteria: { label: string; kind: 'award' | 'penalty'; n: number }[]
  progress: { studentId: string; name: string; avatarId: string | null; up: number }[]
  gifts: { label: string; n: number }[]
}

export type ReportData = ReportSummary & { from: string; to: string; bucket: Bucket }
