import { normalizeVn } from '@/lib/domain/vn-text'

const MAX = 32

/**
 * Tên đăng nhập học sinh: `hs.` + hai chữ cuối của họ tên (không dấu, viết liền), ví dụ "Võ Hà My" → `hs.hamy`.
 * `taken` là mọi tên đã có trên toàn hệ thống; trùng thì thêm 2, 3, ... Không tự thêm kết quả vào `taken`.
 */
export function pickUsername(fullName: string, taken: Set<string>): string {
  const words = normalizeVn(fullName)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
  const key = words.slice(-2).join('') || 'hocsinh'
  const base = `hs.${key}`.slice(0, MAX - 4)
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`
    if (!taken.has(candidate)) return candidate
  }
}
