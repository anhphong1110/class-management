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
    ['no_students', 'Cô hãy chọn ít nhất một học sinh.'],
    ['invalid_points', 'Số sao phải lớn hơn 0.'],
    ['reason_required', 'Cô hãy chọn một tiêu chí hoặc nhập lý do.'],
    ['criterion_mismatch', 'Tiêu chí này không còn dùng được.'],
    ['student_not_found', 'Không tìm thấy học sinh trong lớp.'],
    ['batch_not_found', 'Không tìm thấy bản ghi.'],
    ['already_reversed', 'Bản ghi này đã được hoàn tác.'],
    ['insufficient_stars', 'Không đủ sao khả dụng.'],
    ['reward_not_found', 'Quà này không còn trong trạm.'],
    ['out_of_stock', 'Quà này đã hết.'],
    ['weekly_limit', 'Em đã đổi đủ số lượt trong tuần này.'],
    ['already_processed', 'Yêu cầu này đã được xử lý.'],
    ['stock_below_held', 'Số quà không được ít hơn số yêu cầu đang chờ.'],
    ['group_name_required', 'Cô hãy nhập tên tổ.'],
    ['not_in_group', 'Học sinh này chưa ở tổ nào.'],
    ['group_not_empty', 'Tổ còn thành viên, cô chuyển các bạn sang tổ khác trước nhé.'],
    ['future_date', 'Chưa thể điểm danh cho ngày trong tương lai.'],
    ['subject_in_use', 'Môn này đang có trong thời khóa biểu. Cô hãy đổi các tiết đó sang môn khác trước khi xóa.'],
    ['subject_exists', 'Môn này đã có trong danh sách.'],
    ['subject_name_required', 'Cô hãy nhập tên môn học.'],
    ['announcement_required', 'Cô hãy nhập tiêu đề và nội dung.'],
    ['khong_biet', 'Có lỗi xảy ra, vui lòng thử lại.'],
  ]
  it.each(cases)('%s', (key, msg) => {
    expect(toVietnameseMessage(key)).toBe(msg)
  })
})
