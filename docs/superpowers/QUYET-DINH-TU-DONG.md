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

## Đợt 5: Nhiệm vụ, Gọi tên, Trình chiếu, Cổng học sinh (xong, đã merge vào `main`)

Kết quả: 557 test cơ sở dữ liệu, 265 unit test, 415/417 test trình duyệt trong lần chạy cả bộ (2 test bị quá giờ khi máy chạy nặng; chạy lại riêng 2 test này 8 lần đều đạt, đã nới thời gian chờ), kịch bản đua 12/12.

### Quyền của học sinh
51. **Ảnh trong kho chỉ đọc được khi được phép xem bài gốc.** Học sinh chỉ mở được ảnh của thông báo còn hiện và của quà chưa ẩn. Đây là việc phải sửa đầu tiên của đợt 5 (mục 49), giờ đã xong và có test.
52. **Học sinh đã lưu trữ mất mọi quyền đọc qua API**, kể cả khi phiên đăng nhập cũ vẫn còn. Opus phát hiện điều này trong review cuối đợt.
53. **Bảng xếp hạng cho học sinh chỉ có tên, avatar, sao và hạng.** Không có số thứ tự trong lớp. Học sinh không gọi được hàm xếp hạng theo khoảng ngày tùy ý (`leaderboard_between`), chỉ gọi được theo tên kỳ: tuần, tháng, học kỳ, năm.
54. **Mỗi cờ "học sinh được xem …" chặn ở cả hai nơi:** trang ẩn và trả 404, và cơ sở dữ liệu cũng không trả dữ liệu. Riêng Đổi quà cần bật cả `feature_rewards` lẫn `student_can_view_rewards`. *Nếu sai:* cô tắt một cờ mà học sinh vẫn đọc được dữ liệu đó qua API.
55. **`student_can_view_profile` chưa chặn gì cả.** Để đợt 6 quyết định cờ này dùng vào việc gì.

### Nhiệm vụ & huy hiệu
56. **Mỗi bạn hoàn thành một nhiệm vụ một lần trong mỗi kỳ.** Kỳ có thể là ngày, tuần (dạng `YYYY-Www`) hoặc học kỳ (dạng `T1-2026-2027`). Ghi lần thứ hai trong cùng kỳ thì báo "đã hoàn thành", không cộng sao lần nữa.
57. **Hoàn thành nhiệm vụ và trao huy hiệu chỉ ghi qua hàm của cơ sở dữ liệu.** Hoàn tác sao của nhiệm vụ ở /thi-dua thì xóa luôn dòng hoàn thành, nên ghi nhận lại được. Huy hiệu trao nhầm thì bấm "Thu hồi".
58. **Tắt tính năng nhiệm vụ thì học sinh không thấy nhiệm vụ lẫn huy hiệu.** Trang của cô vẫn dùng được bình thường.
59. **Câu thành công tự đặt** (thiết kế không có): `Đã ghi nhận "<nhiệm vụ>" cho <tên>. Cộng N sao thi đua.`
60. **Nhiệm vụ theo học kỳ dựa vào ngày học kỳ trong Cài đặt.** Mỗi năm học cô phải cập nhật các ngày này.

### Gọi tên ngẫu nhiên
61. **Danh sách "đã được gọi" chỉ lưu trên trình duyệt (sessionStorage) và tự xóa khi sang ngày mới.** Không lưu vào cơ sở dữ liệu.
62. **Bạn chưa được điểm danh hôm nay vẫn được tính là có mặt.** Cô chưa điểm danh thì không loại ai. Đi trễ cũng tính là có mặt.
63. **"+1 sao cho bạn này" chỉ bấm được một lần cho mỗi lượt quay.** Tắt tính năng thì máy chủ từ chối cộng sao.

### Trình chiếu
64. **Bỏ dòng chú thích cuối trong thiết kế** vì dòng đó có chữ "điểm danh", mà trang trình chiếu không được hiện điểm danh.
65. **"Tự động chuyển khối" mặc định tắt.** Khi bật, cứ 15 giây tô một khối. Trang tự làm mới mỗi 5 phút, nên để qua đêm thì "Hôm nay học gì?" tự đổi theo ngày mới.
66. **Câu tự đặt:** "Tuần này chưa có sao thi đua.", "Hôm nay không có tiết học.", nhãn "Chiều · Tiết n".

### Cổng học sinh
67. **Thêm chọn avatar** (thiết kế không có). Bấm avatar ở Trang chủ, mở hộp "Chọn avatar của em", chọn rồi bấm "Lưu avatar". Chỉ hiện khi `student_can_change_avatar` bật; cơ sở dữ liệu cũng kiểm lại cờ này.
68. **Mọi câu "cô Khanh" trong thiết kế đổi thành "cô giáo"** để năm sau dùng cho lớp khác.
69. **Tắt quyền xem xếp hạng thì ô "Thứ hạng" ở Trang chủ ẩn đi**, chỉ còn 2 ô.
70. **Điểm danh của em hiện 10 ngày gần nhất.**
71. **Khi "Cần cô duyệt" tắt, yêu cầu đổi quà được duyệt ngay.** Câu báo nói đã đổi xong, không còn ghi "chờ cô duyệt".
72. **Ở chế độ xem thử, cô thấy dữ liệu của học sinh đầu tiên.** Mọi nút gửi đều bị khóa.
73. **Những câu khác do tôi tự đặt** cho trạng thái trống và thông báo xem thử. Danh sách đầy đủ ở `docs/superpowers/plans/2026-11-01-dot-5-ghi-chu.md`.

### Việc để sang đợt sau
74. Danh sách đầy đủ ở `docs/superpowers/plans/2026-11-01-dot-5-viec-chuyen-tiep.md`. Những mục chính:
    - gom tên "TRẠM KHÔNG GIAN NĂM 8" vào một chỗ để đổi được theo lớp;
    - thứ tự xóa khi "Xóa dữ liệu demo";
    - quyết định cờ `student_can_view_profile`.

## Đợt 6: Cài đặt, Báo cáo, Tài khoản, Sao lưu, Năm học mới, chuẩn bị chạy thật (xong, đã merge vào `main`)

Kết quả: 1021 test cơ sở dữ liệu, 386 unit test, 538 test trình duyệt (375/768/1280px), kịch bản đua 12/12; lint, kiểm kiểu, build sạch.

**Đợt này dừng ở "sẵn sàng triển khai".** Chưa chạy migration lên Supabase thật, chưa tạo project Vercel, chưa đặt mật khẩu giáo viên. Cô làm theo `docs/DEPLOY-NOTES.md`.

### Kế hoạch
75. **Tôi tự duyệt plan đợt 6, theo lời bạn dặn.** Plan nằm ở `docs/superpowers/plans/2026-11-01-dot-6-quan-tri-va-chay-that.md`, gồm 10 task.
76. **Nút "Tạo dữ liệu mẫu" cho production chưa làm** (spec §5 có nhắc). Production bắt đầu trống, còn dữ liệu demo chỉ có ở máy dev. *Nếu sai:* muốn có nút này thì làm thêm một hàm SQL tạo dữ liệu mẫu.

### Cài đặt
77. **Thêm vào mục "Thông tin lớp" (thiết kế chưa có):**
    - 4 ô ngày học kỳ, kèm lời nhắc cập nhật mỗi năm;
    - công tắc "Lớp học thứ Bảy".

    Tắt thứ Bảy khi còn tiết thì hỏi trước: "Xóa và tắt" hoặc "Hủy".
78. **Lưu theo hai cách.** Các công tắc lưu ngay khi bấm. Ô chữ lưu khi bấm "Lưu thông tin". Lưu lỗi thì công tắc tự trở về như cũ.
79. **Số lượt đổi quà mỗi tuần từ 1 đến 20.** Mức sao gợi ý: 1–50, không trùng, tối đa 8 mức. "+ Thêm mức" mở ô nhập số, thay vì tự cộng 1 như thiết kế.
80. **Thêm câu giải thích dưới "Giữ trước sao" và "Chỉ cho đổi khi đủ sao":** khi giữ trước bật thì học sinh luôn phải đủ sao mới gửi được yêu cầu.
81. **Một số cột chỉ đổi được qua hàm của cơ sở dữ liệu, cô không sửa thẳng được:** lưu trữ học sinh, chủ lớp, ngày lưu trữ lớp, thứ Bảy, tồn kho quà. Nhờ vậy mọi thay đổi đều được kiểm tra và có nhật ký.
82. **Học sinh của năm học đã lưu trữ không đọc được gì nữa.** Đăng nhập lại thì thấy "Năm học của em đã kết thúc.".
82a. **Công tắc "Hồ sơ của mình" quyết định 3 ô số ở Trang chủ học sinh.** Đó là các ô sao thi đua, sao khả dụng và thứ hạng. Trước đây công tắc này không có tác dụng gì; nay tắt nó thì 3 ô đó ẩn đi.

### Màu chủ đạo, tên trạm
83. **Màu chủ đạo áp cho mọi nút, mục đang chọn và hộp thoại.** Màu đậm của 4 chủ đề: indigo `#4F5BD5`, hồng `#C2407A`, mint `#12796B`, vàng `#8F5A00`; chữ trắng trên các màu này đều đủ độ tương phản 4.5. Thiết kế chỉ có màu indigo, nên các sắc nhạt/đậm của hồng, mint, vàng là tôi tự đặt. Nút "Cộng sao" vẫn màu cam như thiết kế.
84. **Tên "TRẠM KHÔNG GIAN NĂM N" lấy từ tên lớp** ("Năm 8 (5/8)" → "NĂM 8"), không viết cứng nữa. Tên tab trình duyệt: "Trạm không gian Năm 8".
85. **Mọi công tắc dùng chung một kiểu như thiết kế Cài đặt:** nhãn bên trái, nút gạt bên phải. Công tắc ở Gọi tên vì thế cao hơn một chút.

### Tài khoản học sinh
86. **Tên đăng nhập theo dạng `hs.<tên đệm + tên>` không dấu.** Ví dụ "Võ Hà My" → `hs.hamy`. Trùng thì thêm số: `hs.hamy2`.
87. **Mật khẩu tạm có 10 ký tự, bỏ các chữ dễ nhầm, chỉ hiện một lần.** Chỉ đóng được bảng mật khẩu bằng nút "Đóng", và sẽ được hỏi lại "Cô đã in hoặc ghi lại mật khẩu tạm chưa?". Spec ghi mật khẩu hiện một lần, nên tôi không dùng câu "Đã gửi mật khẩu tạm…" của thiết kế.
88. **Khóa tài khoản có tác dụng ngay.** Học sinh đang đăng nhập bị đưa ra ở lần mở trang kế tiếp, với câu "Tài khoản này đang bị khóa. Em hỏi cô giáo nhé.".
89. **Đăng nhập quá nhiều lần thì báo câu riêng**, không báo "sai mật khẩu". Khi chạy thật nhớ tăng giới hạn đăng nhập trong Supabase: cả lớp đăng nhập cùng lúc qua máy chủ Vercel. Xem bước 3 của DEPLOY-NOTES.
90. **Tạo hàng loạt mà một bạn lỗi thì các bạn khác vẫn được tạo.** Bạn lỗi có tên trong mục "Chưa tạo được:". Không để lại tài khoản thiếu hồ sơ.

### Báo cáo
91. **Học kỳ và Cả năm cần ngày học kỳ.** Chưa đặt thì báo "Cô chưa đặt ngày học kỳ trong Cài đặt.".
92. **Cách tính các con số:**
    - Sao cộng/trừ không tính lần đã hoàn tác.
    - Chuyên cần = có mặt + đi trễ.
    - "Học sinh tiến bộ" đếm mọi bạn có sao tăng so với kỳ trước; danh sách hiện 5 bạn đầu.
    - Phần trăm chuyên cần được làm tròn sao cho cộng lại đúng 100.
93. **Số trong file CSV/Excel không có dấu +, −, %.** Lý do: Excel dễ hiểu nhầm chúng là công thức. Khoảng ngày tự chọn dài nhất 400 ngày; nhãn ngày có kèm dd/mm.

### Sao lưu, khôi phục, năm học mới
94. **File sao lưu đi qua kho file riêng `class-backups`, không qua máy chủ.** Lý do: Vercel giới hạn mỗi lần gửi/nhận 4,5 MB. Kho này chỉ chứa file JSON tối đa 20 MB, và chỉ cô đọc được, cho lớp của mình.
95. **Khôi phục tạo một năm học mới từ file, rồi lưu trữ năm hiện tại.** Không ghi đè, không xóa gì.
    - Trước khi khôi phục, kiểm tra không có bạn nào sao khả dụng âm và quà không bị giữ quá số tồn. File bị sửa tay thì báo "File sao lưu không hợp lệ.".
    - Ảnh chỉ được chép khi file là của lớp do chính cô sở hữu.
    - Học sinh khôi phục chưa có tài khoản; cô tạo lại bằng "Tạo tài khoản hàng loạt".
96. **Mở năm học mới:**
    - Cô chọn những gì chép sang: môn, thời khóa biểu, tiêu chí, quà, avatar, cài đặt, nhiệm vụ. Mặc định chọn hết trừ thời khóa biểu.
    - Không chép học sinh và sao, nên năm mới bắt đầu từ 0.
    - Yêu cầu đổi quà đang chờ của năm cũ bị từ chối và trả lại sao.
    - Học sinh năm cũ không đăng nhập được nữa.
97. **Bấm hai lần không mở hai năm học.** Lần bấm thứ hai báo "Năm học vừa thay đổi, cô tải lại trang nhé.".
98. **Mục danh mục chép sang năm mới giữ nguyên dấu "mẫu".** Nên nếu mở năm mới trước khi xóa dữ liệu demo, quà/môn mẫu vẫn xóa được ở năm mới.
99. **"Xóa dữ liệu demo":**
    - Xóa 10 học sinh mẫu, mọi dữ liệu của các bạn đó, và tài khoản đăng nhập của các bạn đó.
    - Giữ lại quà/môn/tổ mẫu nào mà dữ liệu thật còn dùng, và báo số mục giữ lại.
    - Sổ sao bình thường không xóa được. Chỉ hàm này xóa được, và chỉ dòng của học sinh mẫu.

### Việc nhỏ chuyển tiếp
100. **Đã đóng các mục chuyển tiếp của đợt 1–5:** thông báo, điểm danh, thời khóa biểu, nút "Hoàn tác" cho từng lượt hoàn thành nhiệm vụ, câu báo hoàn tác khi sao đang được giữ cho yêu cầu đổi quà, câu lỗi riêng cho học sinh, xóa ảnh mồ côi. Ảnh tối đa 2 MB sau khi nén, ảnh gốc tối đa 5 MB.

### Chạy thật
101. **`pnpm bootstrap:prod` tạo lớp, 12 avatar, tài khoản cô và chủ lớp.** Mật khẩu lấy từ file `.env.bootstrap.local` (đã gitignore) và không bao giờ in ra. Chạy lần hai thì dừng, không tạo trùng. File này cố ý không đặt tên `.env.production.local`: Next.js tự đọc tên đó khi build ở máy, có thể làm bản build ở máy nối nhầm vào Supabase thật.
102. **`.mcp.json` và `.env.bootstrap.local` được thêm vào `.gitignore`.** File `.mcp.json` của bạn tôi không đụng tới.
102a. **Sao lưu tối đa 50 MB.** Một năm học đông giao dịch có thể vượt 20 MB. Lỗi khi tạo bản sao lưu thì hiện câu "Không tạo được bản sao lưu. Cô thử lại sau nhé.", không báo lỗi trang.
102b. **Tên trường nhập có hay không có chữ "Trường" đều được.** Ứng dụng tự thêm chữ này và không lặp lại.
103. **Các bước cô tự làm nằm trong `docs/DEPLOY-NOTES.md`:**
     - chạy migration;
     - cấu hình Auth, gồm tắt tự đăng ký và tăng giới hạn đăng nhập;
     - không mở schema `private`;
     - Vercel và tên miền;
     - bảng kiểm tra sau khi chạy thật.
104. Việc còn lại sau khi chạy thật (không chặn việc triển khai) có trong `docs/superpowers/plans/2026-11-01-dot-6-viec-chuyen-tiep.md`.
