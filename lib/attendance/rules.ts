export type AttendanceStatus = 'present' | 'late' | 'absent_excused' | 'absent_unexcused'

/** Quy tắc duy nhất: có mặt hoặc đi trễ đều tính là đã đi học. */
export function attended(status: string): boolean {
  return status === 'present' || status === 'late'
}
