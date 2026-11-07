import type { Role } from '@/lib/domain/types'

/**
 * Chế độ chấm thi: trang đăng nhập hiện nút "vào một chạm" cho giáo viên và học sinh.
 * Bật bằng DEMO_MODE=true và đặt tên đăng nhập + mật khẩu của tài khoản dùng để vào.
 * Mật khẩu chỉ đọc ở server, không gửi xuống trình duyệt. Tắt: xóa DEMO_MODE rồi deploy lại.
 */
export type DemoAccount = { username: string; password: string }

type Env = Record<string, string | undefined>

export function isDemoMode(env: Env = process.env): boolean {
  return env.DEMO_MODE?.trim().toLowerCase() === 'true'
}

export function demoAccount(role: Role, env: Env = process.env): DemoAccount | null {
  if (!isDemoMode(env)) return null
  const prefix = role === 'teacher' ? 'DEMO_TEACHER' : 'DEMO_STUDENT'
  const username = env[`${prefix}_USERNAME`]?.trim()
  const password = env[`${prefix}_PASSWORD`]
  if (!username || !password) return null
  return { username, password }
}

/** Những vai có đủ cấu hình để hiện nút vào nhanh. */
export function demoRoles(env: Env = process.env): Role[] {
  return (['teacher', 'student'] as const).filter((r) => demoAccount(r, env) !== null)
}
