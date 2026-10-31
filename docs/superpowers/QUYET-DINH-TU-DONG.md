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

## Đợt 3: Trạm đổi quà (xong, đã merge vào `main`)

Kết quả: 372 test cơ sở dữ liệu, 171 unit test, 225 test trình duyệt, kịch bản đua `scripts/db/reward-race.sh` 12/12. Các tình huống đã thử:
- hai bạn cùng đổi món quà cuối cùng;
- đổi quà trùng lúc cô trừ sao;
- cô bấm "Duyệt" và "Từ chối" cùng lúc.

### Quy tắc nghiệp vụ
22. **Khi "Giữ trước sao" bật (mặc định), học sinh luôn phải đủ sao mới gửi được yêu cầu**, kể cả khi cô tắt "Chỉ đổi khi đủ sao". Lý do: nếu không, sao khả dụng của em bị âm, trái với HANDOFF.md ("không bao giờ âm"). *Hệ quả:* công tắc "Chỉ đổi khi đủ sao" chỉ còn tác dụng khi "Giữ trước sao" tắt. Màn Cài đặt ở đợt 6 sẽ ghi rõ điều này. **Đây là quyết định bạn nên xem kỹ nhất.**
23. **Khi cô tắt "Cần cô duyệt", yêu cầu được duyệt tự động và cột "người duyệt" để trống**, không ghi tên học sinh, vì học sinh không bao giờ tự duyệt quà.
24. **Tồn kho tính như thiết kế.** Quà "đang giữ" là quà có yêu cầu chờ duyệt; tồn kho chỉ giảm khi cô duyệt. Không cho đặt tồn kho thấp hơn số đang giữ, kể cả khi sửa thẳng trong cơ sở dữ liệu (có trigger chặn).
25. **Lưu trữ học sinh đang có yêu cầu chờ thì yêu cầu bị từ chối tự động** và em được trả lại số sao đang giữ.
26. **Số lượt đổi trong tuần** tính từ 0 giờ thứ Hai giờ Việt Nam. Yêu cầu bị từ chối không tính.
27. **Mã yêu cầu sai hoặc của lớp khác đều báo "Bạn không có quyền làm việc này."**, để không lộ việc mã đó có tồn tại.

### Giao diện `/doi-qua`
28. **Thêm những phần thiết kế không có:**
    - ô "Số lượng trong kho", hiện kèm "Đang giữ N";
    - ô "Mô tả";
    - nút "Hủy" (phím Esc cũng đóng khung sửa);
    - nút "Ẩn"/"Hiện", quà đã ẩn mờ đi và có nhãn "Đã ẩn";
    - dòng "Chưa có yêu cầu đổi quà nào." khi chưa có yêu cầu.
29. **Quà mới bắt buộc nhập số lượng trong kho**, để không có quà vừa tạo đã "Hết quà".
30. **"Bookmark tên lửa" dùng hình "Sách"** (cùng màu hồng), vì bộ 8 hình có sẵn của thiết kế không có hình kẹp sách.
31. **Quà mẫu:** 5 quà mẫu lấy từ thiết kế, đánh dấu là dữ liệu mẫu.

### Việc để sang đợt sau
32. **Trước khi mở trang học sinh (đợt 5)** cần làm 3 việc:
    - Thêm hàm riêng trả số quà còn lại cho học sinh. Hàm hiện tại chỉ đúng với cô: học sinh sẽ thấy "Còn 1" dù bạn khác đã giữ món đó.
    - Giữ được tên quà trong lịch sử của học sinh khi quà đã bị ẩn.
    - Bảng xếp hạng cho học sinh chỉ xem theo tên kỳ.
33. Danh sách đầy đủ: `docs/superpowers/plans/2026-11-01-dot-3-viec-chuyen-tiep.md`.

## Đợt 4: Điểm danh, Thời khóa biểu, Thông báo (xong, đã merge vào `main`)

Kết quả: 401 test cơ sở dữ liệu, 194 unit test, 291 test trình duyệt, kịch bản đua 12/12.

### Điểm danh
34. **Khi lưu, gửi toàn bộ lớp đúng như đang thấy trên màn hình.** Nếu hai tab (hay hai máy) cùng lưu một ngày, lần lưu sau đè lần trước. Ban đầu chỉ gửi những bạn đã đổi, nhưng Opus phát hiện cách đó có thể báo "Đã lưu" trong khi cơ sở dữ liệu khác với màn hình. *Nếu sai:* cô sửa ở máy này có thể đè thay đổi vừa làm ở máy khác.
35. **Bỏ chọn trạng thái rồi lưu thì xóa điểm danh của bạn đó cho ngày đó.** Bạn đó trở về "Chưa điểm danh", không bao giờ tự thành "Có mặt".
36. **Học sinh đã lưu trữ không tính vào mọi con số điểm danh**: thẻ, Tổng kết, lịch sử, lịch tháng, file CSV, Tổng quan. *Nếu sai:* lịch sử của những ngày cũ không còn hiện các bạn đã lưu trữ.
37. **"Có mặt" trong mọi con số tổng hợp = có mặt + đi trễ**: lịch tháng, Tổng quan, tỉ lệ chuyên cần. Riêng bảng Tổng kết vẫn tách cột "Đi trễ" như thiết kế.
38. **Thêm lịch tháng và nút "Xuất CSV".** Spec có yêu cầu nhưng thiết kế chưa vẽ. File CSV dùng ký hiệu C (có mặt), K (vắng không phép), P (vắng có phép), T (đi trễ), và chặn kiểu tên học sinh bắt đầu bằng dấu "=" có thể bị Excel chạy như công thức.
39. **Không cho điểm danh ngày trong tương lai.** Ngày tính theo giờ Việt Nam. Xem ngày khác hôm nay thì tiêu đề là "Tổng kết ngày dd/mm" (thiết kế chỉ có "Tổng kết hôm nay").
40. **Có thay đổi chưa lưu mà rời trang thì hỏi lại trước khi rời.**

### Thời khóa biểu
41. **Môn đang dùng không xóa được.** Chặn ngay trong cơ sở dữ liệu, kèm đúng câu báo của thiết kế. Tên môn không trùng trong một lớp, không phân biệt hoa thường.
42. **Thêm lựa chọn "— Trống —"** để bỏ môn khỏi một tiết.
43. **"In / Xuất" có hai lựa chọn:** in (khổ ngang, chỉ in lưới) và tải Excel.
44. **Thứ Bảy:** đã có cột trong cơ sở dữ liệu, mặc định tắt; công tắc bật/tắt làm ở Cài đặt (đợt 6). Khi tắt thì không cho ghi tiết thứ Bảy, kèm câu "Lớp chưa bật học thứ Bảy.".
45. **Nút "Sao chép thời khóa biểu" đang ẩn** cho tới khi có lớp của năm trước (đợt 6).

### Thông báo
46. **"Xóa" (bấm hai lần) chỉ lưu trữ thông báo**, không xóa hẳn trong cơ sở dữ liệu.
47. **Thêm nút "Bỏ hình".**
48. **Chuông ở Header không hiện số.** Cô là người đăng thông báo, nên con số "thông báo mới" không có nghĩa với cô.

### Việc để sang đợt sau
49. **Đợt 5 phải sửa đầu tiên, trước khi có trang học sinh:** hiện học sinh đọc được ảnh của thông báo đã xóa và ảnh của quà đã ẩn, vì quyền đọc kho ảnh còn quá rộng.
50. Danh sách đầy đủ: `docs/superpowers/plans/2026-11-01-dot-4-viec-chuyen-tiep.md`.
