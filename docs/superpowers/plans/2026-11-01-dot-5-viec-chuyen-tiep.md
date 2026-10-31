# Đợt 5: việc chuyển sang đợt 6

Các mục dưới đây lấy từ review cuối đợt 5 (nhánh `dot-5-tuong-tac`) và từ review từng task. Những mục đã sửa trong đợt sửa cuối không có ở đây.

## Đợt 6

- `student_can_view_profile` hiện không quyết định gì cả: không trang, policy hay RPC nào đọc cờ này. Khi làm Cài đặt cần chọn một trong hai: cho cờ này chặn một thứ cụ thể, hoặc bỏ cờ khỏi giao diện.
- Tên trạm "TRẠM KHÔNG GIAN NĂM 8" đang viết cứng ở các file sau:
  - `components/layout/StudentNav.tsx`
  - `components/layout/Sidebar.tsx`
  - `app/trinh-chieu/DisplayClient.tsx`
  - `app/layout.tsx`
  - `app/(teacher)/tong-quan/page.tsx`
  - các chữ dự phòng ở trang đăng nhập (`'Năm 8 (5/8)'`, `'Cô Khanh'`)

  Trước khi sang năm học mới, gom vào một hằng hoặc lấy từ `classes`.
- "Xóa dữ liệu demo" và sao chép sang năm học mới phải xóa `mission_completions` trước `missions`, và `student_badges` trước `badges`. Lý do: các khóa ngoại này là `restrict`, cùng kiểu với `timetable_slots` → `subjects`.
- Gộp các helper đang trùng:
  - `WEEKDAYS` trong `lib/student/attendance.ts` trùng với bản ở `lib/domain/date.ts`.
  - Kiểu `LbRow` khai báo ở cả `lib/student/queries.ts` và `lib/display/queries.ts`.
  - Màu trạng thái điểm danh khác nhau giữa trang học sinh và trang giáo viên. Đây là theo thiết kế, nên chỉ cần thêm chú thích ở cả hai chỗ.
- `/doi-qua` của giáo viên chưa hiện "Tính năng này đang tắt…" khi `feature_rewards` tắt.
- Học sinh đọc được bảng `missions` và cả dòng `class_settings`. Hai bảng này chỉ chứa dữ liệu chung của lớp, không hại gì; chỉ siết lại nếu làm rà soát quyền đọc.
- Bấm hoàn tác ở /thi-dua mà bị chặn vì sao đang giữ cho yêu cầu đổi quà: câu báo nên nói rõ lý do này. Mục này chuyển tiếp từ đợt 3.
- Đổi quà chưa chống gửi trùng phía máy chủ. Hai tab có thể tạo hai yêu cầu, nhưng vẫn không vượt `weekly_redeem_limit`. Nếu cần chống hẳn, thêm nonce.
- Học sinh có thể thấy câu lỗi `invalid_input` vốn viết cho cô ("…cô kiểm tra lại nhé."). Chỉ xảy ra khi gửi id sai định dạng.
- Thông báo ở trang xem thử dùng màu "success". Màu trung tính hợp hơn.
- Tab Gọi tên hoặc Trình chiếu để mở qua nửa đêm: Trình chiếu tự làm mới mỗi 5 phút nên tự đổi ngày; Gọi tên phải tải lại trang mới lấy ngày mới.
- Khóa của nhiệm vụ theo học kỳ dựa vào ngày học kỳ trong `class_settings`. Mỗi năm học cô phải cập nhật các ngày này; màn Cài đặt cần nhắc cô.
- Nhiệm vụ 0 sao không tạo giao dịch sao nào, nên không có nút hoàn tác ở /thi-dua. Ghi nhận nhầm thì không có cách gỡ dòng hoàn thành. Hướng sửa: thêm RPC `undo_mission_completion` cho giáo viên, kèm nút trong /nhiem-vu.
- Đổi quà: học sinh vẫn bấm "Đổi quà" được khi đang có yêu cầu chờ duyệt. Giới hạn tuần chặn số lượng; nếu muốn mỗi lúc chỉ có một yêu cầu thì thêm điều kiện này.
