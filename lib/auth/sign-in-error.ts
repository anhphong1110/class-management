/** Chọn khóa câu báo cho lỗi GoTrue khi đăng nhập bằng mật khẩu. */
export function signInErrorKey(error: { status?: number; code?: string }): 'too_many_logins' | 'account_banned' | 'invalid_credentials' {
  if (error.status === 429 || error.code === 'over_request_rate_limit') return 'too_many_logins'
  if (error.code === 'user_banned') return 'account_banned'
  return 'invalid_credentials'
}
