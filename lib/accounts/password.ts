import { randomBytes } from 'node:crypto'

/** Khớp `minimum_password_length` của Supabase; 72 là giới hạn bcrypt của GoTrue. */
export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 72

export function validateNewPassword(password: string): 'password_too_short' | 'password_too_long' | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'password_too_short'
  if (password.length > MAX_PASSWORD_LENGTH) return 'password_too_long'
  return null
}

/**
 * Mật khẩu nội bộ khi vừa tạo tài khoản: Auth bắt buộc có mật khẩu, nhưng không ai biết nó (không hiện, không lưu).
 * Học sinh chỉ đăng nhập được sau khi cô đặt mật khẩu.
 */
export function generateInternalPassword(): string {
  return randomBytes(24).toString('base64url')
}
