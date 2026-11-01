# Đợt 6: việc còn lại sau khi chạy thật

Các mục dưới đây lấy từ review cuối đợt 6 (nhánh `dot-6-quan-tri`) và từ review từng task. Chúng không chặn việc chạy thật. Nên làm trong một đợt bảo trì sau khi cô đã dùng ổn định.

## Nên làm sớm (trong học kỳ 1)

- **Giới hạn 1000 dòng của PostgREST.** Có hai truy vấn đọc thẳng sổ sao:
  - phần xem thử của trang học sinh (`lib/student/queries.ts`);
  - `shortOnlyBecauseOfHold` ở `app/(teacher)/thi-dua/actions.ts`.

  Khoảng giữa năm, khi sổ sao của lớp quá 1000 dòng, tổng số ở chế độ xem thử có thể sai và câu báo khi hoàn tác có thể sai. Dữ liệu thật không bị ảnh hưởng. Sửa bằng RPC tính tổng.
- **Tài khoản Auth bị kẹt.** Nếu "Xóa dữ liệu demo" xóa hồ sơ được nhưng xóa tài khoản Auth lỗi, email vẫn bị giữ. Khi đó "Tạo tài khoản hàng loạt" báo lỗi mãi cho bạn trùng tên. Sửa: lấy danh sách tên đã dùng từ GoTrue, hoặc thử xóa lại.

## Dọn dẹp định kỳ

- File trong Storage còn sót lại:
  - ảnh quà và avatar mẫu sau khi xóa dữ liệu demo;
  - thư mục ảnh của các năm học đã lưu trữ.
- Tài khoản Auth của học sinh năm cũ: không đăng nhập được nhưng vẫn còn, mỗi năm thêm một lượt. Cần thêm nút "Xóa tài khoản học sinh năm cũ" trong mục "Các năm học đã lưu trữ".

## Có thể làm sau

- Nút "Tạo dữ liệu mẫu" cho production (spec §5). Hiện tại production bắt đầu trống.
- Đổi quà chưa chống gửi trùng phía máy chủ. Giới hạn đổi quà mỗi tuần vẫn được giữ.
- Mỗi học sinh chỉ có một yêu cầu đổi quà đang chờ: tùy cô muốn.
- Trang Gọi tên để mở qua nửa đêm phải tải lại mới sang ngày mới.
- Khi chép ảnh sau khôi phục hoặc mở năm mới bị lỗi, báo cho cô biết. Hiện chỉ ghi log và để trống ảnh.
- Nhãn ngày của báo cáo: khoảng tự chọn 8–14 ngày đã có dd/mm. Có thể làm gọn thêm.
- `attendance.note` học sinh đọc được: hiện chưa có chỗ nào ghi vào cột này. Nếu sau này có, che nó bằng view.
- Thêm test riêng cho thông báo "tính năng đang tắt" ở `/doi-qua`.
