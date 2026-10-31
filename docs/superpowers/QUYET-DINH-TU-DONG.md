# Nhật ký quyết định tự động

Từ tối 2026-10-31, bạn giao cho mình làm tiếp đợt 2–6 mà không cần chờ duyệt, chỉ ghi lại các quyết định. File này liệt kê mọi quyết định mình tự đưa ra, theo thứ tự thời gian, kèm cái giá nếu quyết định đó sai.

## Nguyên tắc mình tự đặt khi chạy không có bạn

- Mỗi đợt làm trên một nhánh riêng. Mỗi task được Opus review, cuối đợt Opus review toàn nhánh. Review sạch thì mới merge vào `main` (merge local, không push vì repo chưa có remote).
- Plan của đợt 3–6 do Opus viết và commit. Mình không chờ bạn duyệt nhưng ghi các điểm cần xem ở đây.
- **Không làm thay bạn** những việc không hoàn tác được hoặc đụng hệ thống bên ngoài:
  - chạy migration lên project Supabase thật;
  - tạo project Vercel, nhập khóa, gắn tên miền;
  - đặt mật khẩu tài khoản của cô.

  Đợt 6 dừng ở trạng thái "sẵn sàng triển khai", kèm hướng dẫn từng bước.
- Gặp lỗi mà mọi hướng sửa đều phải đoán thì mình dừng và ghi lại ở đây, không đoán bừa.

## Đợt 2: Học sinh và sao (xong, đã merge vào `main`)

Kết quả: 283 test cơ sở dữ liệu, 156 unit test, 189 test trình duyệt (375/768/1280px), lint và build sạch. Mỗi task được Opus review, cuối đợt Opus review toàn nhánh và kết luận sẵn sàng merge.

### Cơ sở dữ liệu
1. **Sổ sao chỉ ghi thêm.** Trigger chặn mọi lệnh UPDATE hoặc DELETE trên `star_transactions`, kể cả khi chạy bằng khóa quản trị. *Nếu sai:* không thể sửa tay một dòng sai. Muốn sửa thì phải ghi thêm dòng hoàn tác.
2. **Hoàn tác theo cả lượt.** Mỗi lần cộng/trừ cho nhiều bạn có một `batch_id`, và hoàn tác cả lượt một lúc. Mọi dòng cộng/trừ/hoàn tác bắt buộc có `batch_id`.
3. **Khóa dòng học sinh bằng `FOR NO KEY UPDATE`.** Opus dựng lại được tình huống deadlock thật khi dùng `FOR UPDATE` cùng lúc với lúc ghi điểm danh. Thứ tự khóa chung cho cả dự án: học sinh (theo id) → quà → yêu cầu đổi quà; tổ (theo id) → thành viên tổ; không bao giờ khóa học sinh sau khi đã khóa tổ.
4. **Hoàn tác tính vào kỳ xảy ra hoàn tác.** Hoàn tác một lần cộng của tuần trước thì tuần này hiện −N. Bảng xếp hạng và Tổng quan đều tính theo cùng cách này.
5. **Tổng sao tuần ở Tổng quan được tính trong SQL** (hàm `class_star_totals_between`), vì API của Supabase chỉ trả tối đa 1.000 dòng.

### Giao diện và chữ
6. **Tiêu đề Header của mọi trang chép đúng thiết kế**, ví dụ "Trạm năng lượng ngôi sao", "Bảng xếp hạng phi hành gia xuất sắc", "Lịch bay của phi hành gia". Menu bên trái giữ tên ngắn như cũ. Phần "lớp 5/8" lấy từ tên lớp, nên năm sau tự đổi theo lớp mới.
7. **Vương miện chỉ hiện khi bạn đó hạng 1 và có ít nhất 1 sao.** Nếu không, đầu năm cả lớp 0 sao thì ai cũng được vương miện.
8. **Lời chào nhận cả "Cô" và "Thầy"**: "Cô Khanh" thành "cô Khanh", "Thầy Nam" thành "thầy Nam". Plan ghi máy móc là "bỏ chữ Cô rồi ghép cô", làm vậy thì "Thầy Nam" sẽ thành "cô Thầy Nam".
9. **Tab "Học kỳ"**: nếu lớp chưa đặt ngày học kỳ thì tab này hiện như "Cả năm", để không gắn nhãn sai.
10. **Thêm các nút thiết kế không có chỗ**: "Sửa thông tin" và "Lưu trữ" trong hồ sơ học sinh, "+ Thêm tổ", "Xóa tổ" (chỉ khi tổ trống), thẻ "Chưa có tổ" cho học sinh mới chưa vào tổ. Cũng thêm hộp xác nhận trước khi hoàn tác, vì một lần bấm có thể hoàn tác sao của cả lớp.
11. **Câu chữ thiết kế không có, mình tự viết:** "Cô hãy nhập tên tổ.", "Tiêu chí này không còn dùng được.", "Học sinh này chưa ở tổ nào.", "Tổ còn thành viên, cô chuyển các bạn sang tổ khác trước nhé.", "Mã học sinh đã có trong lớp (kể cả học sinh đã lưu trữ).", "Mã không hợp lệ".
12. **Lưu trữ học sinh cũng gỡ em đó ra khỏi tổ.**
13. **Cho phép hai học sinh trùng số thứ tự.** Thiết kế và cơ sở dữ liệu không cấm việc này.
14. **Số sao tùy chỉnh giới hạn từ 1 đến 100.**

### Nhập/xuất Excel
15. **Thư viện đọc Excel dùng SheetJS 0.20.3 bản chính thức**, lưu thẳng trong repo ở `vendor/` kèm mã sha256. Bản trên npm (0.18.5) có lỗ hổng bảo mật đã biết. *Nếu sai:* repo nặng thêm khoảng 2,4 MB.
16. **Đọc được file CSV do Excel tiếng Việt lưu** (mã Windows-1258), không chỉ UTF-8.
17. **File mẫu chỉ có dòng tiêu đề**; ví dụ nằm ở sheet "Hướng dẫn", để cô không lỡ nhập "Nguyễn Văn A" thành học sinh thật.
18. **Mã học sinh từ HS100 trở đi được sinh đúng.** Trước đây HS100 bị cắt thành "HS10".

### Việc để sang đợt sau
19. **Đợt 5:** học sinh xem bảng xếp hạng chỉ theo tên kỳ (tuần, tháng…), không được truyền ngày tùy ý. Nếu cho truyền ngày tùy ý, một em có thể dò ra bạn mình bị trừ sao lúc nào.
20. **Đợt 6:** khi làm "Màu chủ đạo" trong Cài đặt, phải đổi các màu xanh tím đang viết cứng sang dùng biến màu chung. Hiện gần như không có phần giao diện nào dùng biến này, nên đổi màu sẽ hầu như không thay đổi gì.
21. Danh sách đầy đủ cho đợt 3 trở đi: `docs/superpowers/plans/2026-10-31-dot-2-viec-chuyen-tiep.md`.
