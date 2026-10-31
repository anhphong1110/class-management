import { describe, expect, it } from 'vitest'
import { attendanceDayLabel, attendanceStats, ATTENDANCE_STATUS } from '@/lib/student/attendance'

describe('attendanceStats', () => {
  it('không có dòng nào: tỉ lệ để trống', () => {
    expect(attendanceStats([])).toEqual({ rate: null, absent: 0, late: 0, excused: 0 })
  })
  it('có mặt và đi trễ đều tính là đã đi học', () => {
    const rows = ['present', 'present', 'late', 'absent_excused', 'absent_unexcused'].map((status) => ({ status }))
    expect(attendanceStats(rows)).toEqual({ rate: 60, absent: 1, late: 1, excused: 1 })
  })
  it('làm tròn theo số nguyên', () => {
    const rows = [...Array(99).fill('present'), 'absent_unexcused'].map((status) => ({ status }))
    expect(attendanceStats(rows).rate).toBe(99)
  })
})

describe('attendanceDayLabel', () => {
  it('thứ, ngày/tháng', () => {
    expect(attendanceDayLabel('2026-10-30')).toBe('Thứ Sáu, 30/10')
    expect(attendanceDayLabel('2026-11-01')).toBe('Chủ Nhật, 01/11')
  })
})

describe('ATTENDANCE_STATUS', () => {
  it('nhãn tiếng Việt cho 4 trạng thái', () => {
    expect(Object.values(ATTENDANCE_STATUS).map((s) => s.label)).toEqual(['Có mặt', 'Đi trễ', 'Vắng có phép', 'Vắng không phép'])
  })
})
