export function safeNext(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return null
  // Ký tự điều khiển (tab/CR/LF bị trình duyệt bỏ qua) và dấu gạch ngược có thể biến `/\t/x` thành `//x`.
  if (/[\x00-\x1F\x7F\\]/.test(raw)) return null
  try {
    const base = 'http://local.invalid'
    const u = new URL(raw, base)
    if (u.origin !== base) return null
    const result = u.pathname + u.search + u.hash
    // Chuẩn hóa dot-segment có thể tạo ra đường dẫn protocol-relative (`/.//x` -> `//x`).
    if (result.startsWith('//') || result.startsWith('/\\')) return null
    return result
  } catch {
    return null
  }
}
