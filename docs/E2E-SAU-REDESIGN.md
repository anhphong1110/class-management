# E2E cần cập nhật sau khi thiết kế lại giao diện

Lần redesign (Claymorphism, xanh trời) **không sửa và không chạy e2e**, theo thỏa thuận: duyệt giao diện trước, sửa e2e sau.
Unit test (`pnpm test`, 390 ca), `tsc`, `eslint` và `pnpm build` đều qua.

## Nguyên nhân chung
- Màu chủ đạo `indigo` đổi từ `#4F5BD5` sang xanh trời `#2563EB` (soft `#E0EEFF`, ink `#1D4ED8`, deep `#1E40AF`). Mọi `toHaveCSS` khóa `rgb(79,91,213)`, `rgb(238,240,255)`, `rgb(44,55,168)`, `rgb(232,235,255)` cần cập nhật.
- Sidebar cô giáo chia nhóm bằng các `li` tiêu đề (không phải link) trong cùng một `ul`; vẫn 14 link. Sidebar không còn nền navy.
- Menu học sinh dưới `lg` thành thanh tab đáy (`position: fixed`), không còn hàng ngang trong `aside`. Quá 5 trang thì 4 mục + nút "Thêm".
- Nhiều thao tác nay qua hộp xác nhận (`ConfirmDialog` dùng `Modal`, role `dialog`, không phải `alertdialog`).

## Spec dự kiến đỏ
| Spec | Lý do |
|---|---|
| `shell.spec.ts` | bố cục `aside`/`nav ul` (hàng ngang dưới `lg` của học sinh, `sidebar-foot` có thêm nút "Xem như học sinh"), có thể màu |
| `theme.spec.ts`, `settings.spec.ts` | khóa màu nút indigo cũ; theme picker đổi cấu trúc |
| `student-portal.spec.ts` | màu dòng "em" (`rgb(238,240,255)`, `rgb(79,91,213)`) |
| `student-pages.spec.ts` | `getByRole('alertdialog', {name:'Xác nhận đổi quà'})` nay là `dialog` tên "Em có chắc không?"; màu ô hôm nay |
| `timetable.spec.ts` | màu ô/swatch; "Xóa môn …" mở hộp xác nhận |
| `rewards.spec.ts` | "Từ chối" cần xác nhận trong hộp thoại |
| `announcements.spec.ts` | bước "Bấm lần nữa để xóa" thay bằng hộp thoại |
| `backup.spec.ts` | "Lưu trữ năm học" có thêm xác nhận; xóa dữ liệu demo hai bước (tick xác nhận) |
| `accounts.spec.ts` | "Đặt lại mật khẩu" có hộp xác nhận |
| `students.spec.ts` (~203–205) | "Xóa tổ" mở hộp xác nhận trước |
| `attendance.spec.ts` | nhãn "Đang lưu…" khi lưu |
| `overview.spec.ts` | thẻ thống kê nay là link, có ghi chú bên trong |
| `stars.spec.ts` | xác nhận/hoàn tác dùng `ConfirmDialog` (tiêu đề, nút giữ nguyên) |

Khả năng vẫn qua: `reports.spec.ts`, phần còn lại của `settings.spec.ts`.

## Hành vi mới nên thêm test
Nhóm menu cô giáo, thanh tab đáy học sinh, `UndoToast` "Hoàn tác" ở `/thi-dua`, "Tất cả có mặt" và trạng thái lưu ở `/diem-danh`, nút "Xem như học sinh" (`/em`) và dải "Đang xem thử", hiện/ẩn mật khẩu và ghi nhớ tab ở đăng nhập, tiến độ "Còn N sao nữa" ở `/em/doi-qua`.

## Việc không làm được lần này
- Chấm "thông báo chưa đọc": chưa có dữ liệu đã đọc/chưa đọc.
- Tô "tiết hiện tại" ở thời khóa biểu: dữ liệu chưa có giờ từng tiết.
- Hoàn tác khi lưu trữ học sinh: chưa có thao tác khôi phục.
- Hoàn tác ở `/thi-dua` dùng `undoBatch` hiện có (ghi thêm bản ghi đảo), không tạo thao tác ngược giả.
