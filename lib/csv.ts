/** Ô văn bản bắt đầu bằng = + - @ hoặc tab/CR bị Excel hiểu là công thức, nên thêm dấu nháy đơn phía trước. */
export function safe(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
}

export function field(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}
