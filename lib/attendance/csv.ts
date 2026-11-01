export type Status = 'present' | 'absent_unexcused' | 'absent_excused' | 'late'

const SYMBOL: Record<Status, string> = { present: 'C', absent_unexcused: 'K', absent_excused: 'P', late: 'T' }

/** Ô văn bản bắt đầu bằng = + - @ hoặc tab/CR bị Excel hiểu là công thức, nên thêm dấu nháy đơn phía trước. */
export function safe(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
}

export function field(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** `cells` tra theo mã học sinh rồi theo ngày `YYYY-MM-DD`. File UTF-8 có BOM để Excel đọc đúng tiếng Việt. */
export function buildMonthCsv(
  students: { code: string; fullName: string }[],
  days: string[],
  cells: Record<string, Record<string, Status>>,
): string {
  const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
  const header = ['Mã học sinh', 'Họ và tên', ...days.map(dayLabel), 'Có mặt', 'Vắng không phép', 'Vắng có phép', 'Đi trễ']
  const lines = [header.map(field).join(',')]
  for (const s of students) {
    const mine = cells[s.code] ?? {}
    const count = (st: Status) => days.filter((d) => mine[d] === st).length
    lines.push(
      [
        safe(s.code),
        safe(s.fullName),
        ...days.map((d) => (mine[d] ? SYMBOL[mine[d]] : '')),
        String(count('present')),
        String(count('absent_unexcused')),
        String(count('absent_excused')),
        String(count('late')),
      ]
        .map(field)
        .join(','),
    )
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}
