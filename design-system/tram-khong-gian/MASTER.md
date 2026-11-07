# Design system: Trạm không gian Năm 8

Nguồn chuẩn cho giao diện (cập nhật 07/11/2026). Bản sinh tự động của skill ui-ux-pro-max được thay bằng bảng màu và token thật của dự án. Mọi giá trị nằm trong `app/globals.css` và `lib/domain/theme.ts`.

## Đối tượng và phong cách
- Cô giáo và học sinh lớp 5: dễ dùng, dễ thương, màu tươi sáng. Phong cách Claymorphism nhẹ (viền 2px, gờ đáy 4px, bo lớn, lún khi bấm), không dark mode.
- Chủ đề không gian ("Trạm không gian", phi hành gia). Xưng "cô" và "em", câu ngắn.

## Màu
| Vai trò | Giá trị |
|---|---|
| Chính (khóa `indigo`, "Xanh trời") | `#4DA3FF`; nút `#2563EB`; nhạt `#E0EEFF`; mực `#1D4ED8`; đậm `#1E40AF` |
| Nền trang / viền thẻ | `#EEF7FF` / `#CFE3FF` |
| Mực chữ / chữ phụ | `#231F4D` / `#5B5890` |
| Vàng sao | `#FFC93C` (gờ `#F0B100`, nhạt `#FFF3C4`, chữ `#7A4E00`) |
| Hồng kẹo / mint / cam | `#FF6FAE` / `#5EDCC5` / `#FF9F43` |
| Nguy hiểm | `#C0314E`, đậm `#8E1B3B`, nền `#FFE3EA` |
| Thành công | `#12796B`, đậm `#0B5A4D`, nền `#DDF6F1` |
Ba chủ đề khác (`pink`, `mint`, `gold`) đổi cả nền trang và viền theo `lib/domain/theme.ts`. Chữ trắng trên nút phải đạt 4.5:1 (có unit test).

## Chữ
Baloo 2 (tiêu đề, số, 600 – 800) và Nunito (nội dung, 400 – 800), cả hai có subset tiếng Việt. Nội dung tối thiểu 16px, dòng 1.5.

## Token
- Bán kính: `chip` 12, `ctl` 16, `panel` 20, `card` 24 (lớp `rounded-chip|ctl|panel|card`).
- Bóng: `shadow-ledge` (gờ đáy), `shadow-ledge-active`, `shadow-pop` (toast, nổi).
- Lớp tiện ích: `.clay-card`, `.clay-press` (đặt `--edge` cho màu gờ), `.clay-field`, `.skeleton`.
- Tông pastel dùng chung: `components/ui/tones.ts`.

## Thành phần (`components/ui`)
`Button` (primary, secondary, ghost, danger, accent; size md, lg; `loading`), `ButtonLink`, `IconButton` (bắt buộc `label`), `SegmentedTabs`, `Input`/`Select`/`Textarea`/`Field`, `Card`, `Modal`, `ConfirmDialog`, `Notice`, `UndoToast`, `Badge`, `StatCard`, `EmptyState`, `ProgressBar`, `Skeleton`, `Switch`, `Icon`.
Khung: `AppShell`, `PageHeaderShell`, `Sidebar`, `StudentNav`.

## Quy tắc
- Mỗi màn hình một nút chính. Nút nguy hiểm có icon, tách xa nút an toàn, qua `ConfirmDialog`.
- Hover, focus, active được đặt rõ; vòng focus 3px màu `primary-strong`. Không để trình duyệt tự đổi màu.
- Không dùng màu làm tín hiệu duy nhất: kèm icon hoặc chữ.
- Vùng bấm tối thiểu 44px (học sinh 48 – 52px). Không có cuộn ngang ngoài bảng và menu hàng cuộn.
- Học sinh: dưới `lg` dùng thanh tab đáy tối đa 5 mục, nhiều hơn thì "Thêm".
- Không gõ hex trong `className` (test `hex-guard` chặn tăng). Ngoại lệ: hình SVG, màu trang trí, trang đăng nhập và trình chiếu nền navy.
- Tôn trọng `prefers-reduced-motion`.

## Tránh
Dark mode, emoji làm icon, gradient tím lệch bảng màu, nút trong suốt chìm vào nền, placeholder màu đen.
