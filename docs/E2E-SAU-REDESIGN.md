# Trạng thái e2e sau khi thiết kế lại giao diện (07/11/2026)

Lần chạy cuối **bị dừng giữa chừng theo yêu cầu**, nên e2e **chưa được xác nhận xanh toàn bộ** sau các thay đổi cuối. Cần chạy lại.

## Đã chạy được gì
| Lần | Cách chạy | Kết quả |
|---|---|---|
| 1 và 2 | `next dev` | 26 – 29 lỗi, 120 – 175 test không chạy. Phần lớn do dev server biên dịch chậm và lỗi dây chuyền, không phải lỗi giao diện. |
| 3 | `next start` (bản build) | 33 lỗi. Nguyên nhân thật: `loading.tsx` làm danh sách không cập nhật sau khi lưu. Đã xóa `app/(teacher)/loading.tsx` và `app/em/loading.tsx`. |
| 4 | `next start`, sau khi xóa `loading.tsx` | **530 đạt, 3 lỗi, 11 bỏ qua, 8 không chạy.** Ba lỗi: `stars.spec.ts:154` và `student-pages.spec.ts:162` đạt khi chạy riêng (chập chờn); `students-import.spec.ts:20` lỗi thật trên điện thoại. |
| Sau lần 4 | chạy riêng | Sửa `Modal` cuộn được trên màn nhỏ: `students-import.spec.ts` đạt 9/9. Thêm `tests/e2e/ui-refresh.spec.ts`: 12/12 đạt. |
| 5 (kiểm tra cuối) | `next start` | **Dừng ở 147/564** (đang ở project `mobile`, `student-portal.spec.ts`), chưa có kết quả tổng. |

## Chưa chạy, cần chạy lại
- Toàn bộ project `mobile` từ `student-portal.spec.ts:154` trở đi, và toàn bộ project `tablet` và `desktop` của lần 5.
- Thay đổi sau lần 4 chưa được kiểm chứng trên toàn bộ suite: `components/ui/Modal.tsx` (giới hạn chiều cao, cuộn) và bộ chọn in `first-of-type` ở `TimetableClient.tsx`.
- Hai spec chạy chập chờn khi chạy cả bộ: `stars.spec.ts:154` (lỗi `not_allowed` ở bước dựng dữ liệu) và `student-pages.spec.ts:162` (đăng nhập bị đưa về `/dang-nhap`). Cần xem lại nếu còn lặp.

## Cách chạy lại
Bật Docker Desktop, rồi:

```bash
pnpm supabase start
```

```bash
pnpm seed:dev
```

Chạy trên bản build (ổn định hơn `next dev`, dev server biên dịch chậm làm test chập chờn):

```bash
pnpm build && pnpm start
```

Ở cửa sổ khác:

```bash
pnpm exec playwright test --reporter=line
```

Playwright dùng lại server đang chạy ở cổng 3000. Cả bộ mất khoảng 10 phút (3 khổ màn hình). Có thể chạy riêng một khổ bằng `--project=desktop`.

## Những spec đã sửa cho khớp giao diện mới
- Màu theo chủ đề: `theme`, `settings`, `shell`, `student-portal`, `student-pages`, `timetable`.
- Hộp xác nhận mới (thay cho bấm hai lần hoặc `alertdialog`): `accounts` (đặt lại mật khẩu), `announcements` (xóa), `new-year` (lưu trữ năm học và xóa dữ liệu demo hai bước), `rewards` (từ chối), `student-pages` (đổi quà, tên hộp là "Em có chắc không?"), `students` (xóa tổ), `timetable` (xóa môn).
- `student-portal`: menu 7 mục dưới `lg` là thanh tab đáy (4 mục + "Thêm"); thêm test kiểm vị trí thanh tab.
- `settings`: chờ trang hydrate trước khi điền ô (điền sớm bị React ghi đè, gây chập chờn).
- `timetable`: nút ngày dùng `exact: true` vì ô có `aria-label` bắt đầu bằng tên thứ.

## Phát hiện từ e2e (đã sửa trong mã)
- `loading.tsx` làm giao diện không cập nhật sau thao tác lưu và làm trang 404 trả mã 200: đã bỏ.
- `Modal` không cuộn trên điện thoại, nút xác nhận nằm ngoài màn hình: đã sửa.
- Bố cục in thời khóa biểu hỏng vì skip link làm lệch `div:first-child`: đã sửa bằng `first-of-type`.

## Chưa làm
- Test e2e cho: `UndoToast` Hoàn tác ở `/thi-dua`, "Tất cả có mặt" và nhãn "Đã lưu" ở `/diem-danh`, tiến độ "Còn N sao nữa" ở `/em/doi-qua`.
- Test unit riêng cho `Modal` cuộn (hiện chỉ có e2e `students-import` bắt được).
