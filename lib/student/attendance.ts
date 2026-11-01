import { attended } from '@/lib/attendance/rules'
import { WEEKDAYS } from '@/lib/domain/date'

/**
 * Nhãn và màu [nền, chữ] của từng trạng thái; màu chép từ Student.dc.html (attDays, attStats).
 * Trang giáo viên dùng bảng màu đậm riêng ở app/(teacher)/diem-danh/AttendanceClient.tsx (OPT) và
 * MonthCalendar.tsx; đổi màu ở đây thì xem lại hai nơi đó cho khớp ý nghĩa từng trạng thái.
 */
export const ATTENDANCE_STATUS: Record<string, { label: string; bg: string; ink: string }> = {
  present: { label: 'Có mặt', bg: '#DDF6F1', ink: '#0B5A4D' },
  late: { label: 'Đi trễ', bg: '#FFF1CC', ink: '#6E4700' },
  absent_excused: { label: 'Vắng có phép', bg: '#E3EEFF', ink: '#1F4C9E' },
  absent_unexcused: { label: 'Vắng không phép', bg: '#FFE3EE', ink: '#8E1B3B' },
}

export type AttendanceStats = { rate: number | null; absent: number; late: number; excused: number }

export function attendanceStats(rows: { status: string }[]): AttendanceStats {
  const count = (s: string) => rows.filter((r) => r.status === s).length
  const present = rows.filter((r) => attended(r.status)).length
  return {
    rate: rows.length === 0 ? null : Math.round((present / rows.length) * 100),
    absent: count('absent_unexcused'),
    late: count('late'),
    excused: count('absent_excused'),
  }
}

/** `YYYY-MM-DD` (cột date, không có múi giờ) thành "Thứ Sáu, 30/10". */
export function attendanceDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${wd}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}
