# Trạng thái e2e sau khi thiết kế lại giao diện

Cập nhật 07/11/2026. Dự án chỉ dùng trên trình duyệt máy tính, nên chỉ chạy project `desktop` (1280×800).

## Kết quả mới nhất
`pnpm exec playwright test --project=desktop` trên bản build (`pnpm build && pnpm start`): **187 đạt, 1 bỏ qua, 0 lỗi** (3,4 phút), gồm cả `ui-refresh.spec.ts` (hành vi giao diện mới).

## Chưa chạy
- Project `mobile` (375px) và `tablet` (768px): bỏ qua theo yêu cầu. Lần chạy cũ trước khi sửa `Modal` có 3 lỗi ở mobile (2 chập chờn, 1 là `Modal` không cuộn, đã sửa); sau đó mobile/tablet chưa chạy lại toàn bộ. Nếu sau này cần giao diện điện thoại thì chạy `pnpm exec playwright test --project=mobile` và `--project=tablet`.
- Test e2e chưa viết cho: `UndoToast` Hoàn tác ở `/thi-dua`, "Tất cả có mặt" và nhãn "Đã lưu" ở `/diem-danh`, tiến độ "Còn N sao nữa" ở `/em/doi-qua`.
- Test unit riêng cho `Modal` cuộn (hiện chỉ `students-import.spec.ts` bắt được).

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
pnpm exec playwright test --project=desktop --reporter=line
```

## Phát hiện từ e2e (đã sửa trong mã)
- `loading.tsx` làm giao diện không cập nhật sau thao tác lưu và làm trang 404 trả mã 200: đã bỏ.
- `Modal` không cuộn trên màn nhỏ, nút xác nhận nằm ngoài màn hình: đã sửa.
- Bố cục in thời khóa biểu hỏng vì skip link làm lệch `div:first-child`: đã sửa bằng `first-of-type`.

## Spec đã sửa cho khớp giao diện mới
- Màu theo chủ đề: `theme`, `settings`, `shell`, `student-portal`, `student-pages`, `timetable`.
- Hộp xác nhận mới: `accounts`, `announcements`, `new-year`, `rewards`, `student-pages` (tên hộp "Em có chắc không?"), `students`, `timetable`.
- `student-portal`: menu dưới `lg` là thanh tab đáy; `settings`: chờ hydrate trước khi điền ô; `timetable`: nút ngày dùng `exact: true`.
