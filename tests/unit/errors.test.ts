import { describe, expect, it } from 'vitest'
import { toVietnameseMessage } from '@/lib/errors'

describe('toVietnameseMessage', () => {
  const cases: [string, string][] = [
    ['invalid_credentials', 'Tên đăng nhập hoặc mật khẩu chưa đúng.'],
    ['invalid_username', 'Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới.'],
    ['no_profile', 'Tài khoản này chưa được gắn với lớp. Em hãy báo cô giáo nhé.'],
    ['avatar_not_allowed', 'Cô chưa bật quyền tự đổi avatar.'],
    ['avatar_not_found', 'Avatar này không còn trong thư viện.'],
    ['not_allowed', 'Bạn không có quyền làm việc này.'],
    ['file_too_large', 'Ảnh lớn hơn 5 MB, cô chọn ảnh nhỏ hơn nhé.'],
    ['unsupported_type', 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.'],
    ['khong_biet', 'Có lỗi xảy ra, vui lòng thử lại.'],
  ]
  it.each(cases)('%s', (key, msg) => {
    expect(toVietnameseMessage(key)).toBe(msg)
  })
})
