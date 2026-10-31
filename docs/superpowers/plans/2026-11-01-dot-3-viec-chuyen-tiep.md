# Đợt 3: việc chuyển sang các đợt sau

Rút từ review cuối đợt 3 (nhánh `dot-3-doi-qua`).

## Đợt 4 (điểm danh, thời khóa biểu, thông báo)

- Ghi điểm danh hàng loạt chèn nhiều dòng có khóa ngoại tới `students`. Không được khóa `students` bằng `FOR UPDATE` ở bất kỳ hàm mới nào: dùng `FOR NO KEY UPDATE` (thứ tự khóa ở đầu `20261101000008_star_functions.sql`).

## Đợt 5 (trang học sinh) — bắt buộc trước khi học sinh dùng

1. **Số quà "còn" cho học sinh.** `getRewards` chỉ đúng với phiên giáo viên (RLS của học sinh chỉ thấy yêu cầu của mình, nên `held` = 0 với bạn khác; đã kiểm: B thấy "Còn 1" khi A đã giữ món cuối). Cần hàm/view `security definer` trả `left` cho mỗi quà đang hiện (ví dụ `public.reward_availability()`), chỉ cột công khai.
2. **Tên quà trong lịch sử của học sinh** khi quà đã bị ẩn: policy học sinh lọc quà ẩn nên join `rewards(name)` ra null. Lấy tên qua hàm definer hoặc chốt tên vào yêu cầu.
3. **Bảng xếp hạng cho học sinh chỉ theo tên kỳ** (`leaderboard_for_period(p_period text)` tính mốc trong SQL), thu hồi quyền học sinh gọi `leaderboard_between` với ngày tùy ý.
4. Câu lỗi khi hoàn tác bị chặn vì sao đang giữ cho yêu cầu đổi quà nên nói rõ lý do ("đang giữ cho yêu cầu đổi quà").

## Đợt 6 (cài đặt, báo cáo, chạy thật)

- Màn Cài đặt phải giải thích: khi "Giữ trước sao" bật, học sinh luôn cần đủ sao để gửi yêu cầu; "Chỉ đổi khi đủ sao" chỉ còn tác dụng khi "Giữ trước sao" tắt.
- `class_settings.weekly_redeem_limit` chưa có CHECK (nhận số âm); thêm `check (weekly_redeem_limit >= 0)` và quyết định 0 nghĩa là gì.
- Lưu trữ học sinh bằng UPDATE trực tiếp `students.archived_at` (RLS cho phép giáo viên) bỏ qua `archive_student` nên không trả sao đang giữ; `approve_reward_request` cũng chưa lọc học sinh đã lưu trữ. Thêm trigger chặn sửa trực tiếp `archived_at` hoặc chạy logic trả sao.
- Chưa có nhật ký cho thêm/sửa/ẩn quà và sửa tồn kho trực tiếp (đi qua RLS). Cần khi làm Báo cáo.
- File ảnh mồ côi trong `class-media/<lớp>/rewards/` khi tải lên trùng lúc; `signAvatarPaths` im lặng khi ký URL lỗi.
- Câu `file_too_large` nói 5 MB trong khi máy chủ giới hạn 2 MB (chỉ gặp khi bỏ qua bước nén).
