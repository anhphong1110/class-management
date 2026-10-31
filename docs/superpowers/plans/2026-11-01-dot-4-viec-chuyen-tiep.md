# Đợt 4: việc chuyển sang các đợt sau

Rút từ review cuối đợt 4 (nhánh `dot-4-lop-hang-ngay`).

## Đợt 5 — bắt buộc trước khi có trang học sinh

1. **Ảnh trong Storage.** Policy `class_media_select` (`20261101000004_storage_avatar.sql`) cho mọi người cùng lớp đọc mọi file dưới `<lớp>/`. Học sinh đọc được ảnh của thông báo đã xóa (đã thử, kể cả khi tắt cờ xem thông báo) và ảnh của quà đã ẩn. Sửa: thư mục `announcements/` chỉ đọc khi `private.is_teacher()` hoặc tồn tại thông báo (theo RLS của người gọi) có `image_path` đúng file đó; tương tự `rewards/` với quà không ẩn. Có pgTAP.
2. Trang học sinh và chế độ trình chiếu phải lọc thứ Bảy theo `class_settings.timetable_saturday` (RLS vẫn trả các dòng thứ Bảy).
3. Gộp bảng màu thông báo: Tổng quan dùng `announcementColors` từ `lib/announcements/types` (đang có bản sao `NEWS_COLOR`).
4. Test e2e thay ảnh / "Bỏ hình" / `announcement_not_found` trước khi học sinh thấy ảnh.
5. Các mục của `2026-11-01-dot-3-viec-chuyen-tiep.md` (số quà còn cho học sinh, tên quà ẩn trong lịch sử, bảng xếp hạng theo tên kỳ).

## Đợt 6

- Bật/tắt thứ Bảy ở Cài đặt: khi tắt mà còn tiết thứ Bảy thì hỏi xóa các tiết đó; cho phép `setSlot(…, null)` với thứ Bảy để dọn; `usedCount` hiện đang đếm cả tiết thứ Bảy ẩn.
- Bỏ policy `teacher_insert` / `teacher_update` trên `attendance` để mọi ghi đi qua `save_attendance` (kiểm ngày, kiểm học sinh, có nhật ký).
- Giới hạn ngày điểm danh sớm nhất theo ngày bắt đầu năm học.
- Câu lỗi khi danh sách lớp đổi giữa chừng: "Danh sách lớp vừa thay đổi, cô tải lại trang nhé."
- `attendance.note` học sinh đọc được; nếu sau này có ghi chú điểm danh thì che bằng view.
- Thông báo: thêm `.eq('class_id', …)` vào các Server Action; `togglePin` gửi trạng thái đích; ảnh mồ côi khi tải trùng lúc; giới hạn ảnh phía client 2 MB (không phải 5 MB).
- Tên môn: chuẩn hóa NFC trước khi lưu.
- "Xóa dữ liệu demo" và sao chép năm học mới phải xử lý `timetable_slots` trước `subjects` (khóa ngoại `restrict`).
- Điểm danh: link guard so `?ngay` thay vì cả chuỗi truy vấn; bỏ hỏi khi bấm kèm phím Ctrl/Cmd; `getDay` sắp `student_id`.
- Thời khóa biểu: in ở chế độ "Theo ngày" vẫn in cả tuần; test in ở bề rộng ~1050px.
- Công tắc dùng chung: thứ tự nút gạt / nhãn theo thiết kế.
