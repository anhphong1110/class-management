# Đợt 7: Refactor mã theo giao diện mới (Claymorphism xanh trời)

## Bối cảnh
Giao diện mới đã được duyệt (07/11/2026). Đợt redesign làm nhanh bằng 4 luồng song song nên còn nợ kỹ thuật: mỗi trang tự viết lại vài mẫu giống nhau, nhiều giá trị gõ cứng, e2e chưa sửa và toàn bộ thay đổi chưa commit.

Mục tiêu của đợt này: **giữ nguyên giao diện và hành vi**, nhưng gom mã về một bộ thành phần dùng chung để sửa một chỗ là đổi cả web, rồi khôi phục lưới an toàn (e2e).

### Số đo hiện tại (đo ngày 07/11)
| Hạng mục | Số lượng |
|---|---|
| File thay đổi chưa commit | 70 |
| `<button>` thô ngoài `components/ui` | 31 |
| `<input>` thô ngoài `components/ui` | 9 |
| Spinner tự viết (hằng `SPIN` hoặc `animate-spin`) | 11 file |
| Link tự tạo kiểu nút bằng `clay-press` | 14 file, cộng `app/em/LinkButton.tsx` |
| Bảng icon/nhãn trạng thái tự định nghĩa (điểm danh, đổi quà) | 6 file |
| `shadow-[…]` gõ tay | 17 |
| Bán kính gõ tay (`rounded-[14px]`, `[16px]`, `[20px]`, `[18px]`, `[12px]`…) | khoảng 100 |
| Mã hex trong component | khoảng 150. Nhiều nhất: `tong-quan/page.tsx` 45, `DisplayClient` 26, `LeaderboardClient` 23, `Avatar` 23 (hình vẽ SVG, giữ nguyên) |
| File client trên 400 dòng | `StarsClient` 641, `SettingsClient` 491, `DataSection` 440, `MissionsClient` 422 |
| Spec e2e dự kiến đỏ | 13 (xem `docs/E2E-SAU-REDESIGN.md`) |

## Nguyên tắc
- Không đổi giao diện nhìn thấy, chuỗi tiếng Việt, `data-testid`, `h1`, role/aria, server action hay truy vấn.
- Mỗi bước là một commit riêng, sau mỗi bước `tsc`, `eslint` và `pnpm test` phải xanh.
- Thứ tự: thành phần dùng chung trước, rồi mới thay ở các trang.

## Các bước

### Bước 0. Chốt mốc giao diện mới
- Tạo nhánh `feat/ui-claymorphism` từ `main` và commit phần redesign hiện có. Chia thành các commit: token/primitive, khung/menu, đăng nhập, trang học sinh, trang cô giáo, docs.
- Thêm `.claude/launch.json` vào `.gitignore` nếu không muốn đưa lên repo.
- Push qua SSH alias `github-anhphong1110`.

### Bước 1. Bổ sung thành phần dùng chung (`components/ui/`)
| Thành phần | Thay cho | Ghi chú |
|---|---|---|
| `Button` thêm prop `loading` | 11 spinner tự viết | Khi `loading`: hiện spinner, `disabled`, `aria-busy`. Spinner tắt quay khi giảm chuyển động. |
| `ButtonLink` (Next `Link` mang kiểu `Button`) | `app/em/LinkButton.tsx` và khoảng 14 link `clay-press` tự viết | Cùng `variant`/`size` với `Button`. |
| `IconButton` | Nút chỉ có icon: chuông, xem như học sinh, đóng, hiện/ẩn ký tự | Bắt buộc có `aria-label`, tối thiểu 44px. |
| `SegmentedTabs` | Tab đăng nhập, tab xếp hạng, chế độ cộng/trừ ở `/thi-dua` | Có `role="tablist"` và di chuyển bằng phím mũi tên. Giữ nhãn để e2e `getByRole('tab')` không đổi. |
| `StatusBadge` và bảng trạng thái | Map icon/nhãn trong 6 file | Bảng trạng thái đặt ở `lib/attendance/status-ui.ts` và `lib/rewards/status-ui.ts`. `lib/rewards/status.ts` giữ nguyên (e2e khóa màu "Từ chối"). |
| `tones.ts` | `NAV_TONES`, tông màu của `StatCard`, các bảng pastel rải rác | Một nguồn duy nhất cho blue, purple, mint, star, pink. |
| Test unit cho các thành phần mới | | Kiểm `loading`, phím mũi tên của tab, `aria-label` bắt buộc. |

### Bước 2. Token hóa giá trị gõ cứng (`app/globals.css`)
- **Bán kính:** dùng `--radius-sm` 12, `--radius-ctl` 16, `--radius-panel` 20, `--radius-card` 24. Thay các `rounded-[…px]` bằng `rounded-sm|ctl|panel|card`. Các giá trị 14 và 18 làm tròn về 16 và 20; chênh lệch dưới 2px, mắt thường gần như không thấy.
- **Bóng đổ:** dùng `--shadow-clay` và `--shadow-pop` (toast, menu nổi). Thay 17 `shadow-[…]`.
- **Màu trang trí:** thêm `--color-medal-gold/silver/bronze` và tông pastel của hero. Áp vào `tong-quan`, `LeaderboardClient`, `RandomClient`, `DisplayClient`. Hình SVG trong `Avatar.tsx` giữ hex.
- **Lưới chặn:** một unit test quét `app/**/*.tsx` và báo lỗi khi có hex trong `className` ngoài danh sách cho phép, để nợ không quay lại.

### Bước 3. Thay ở các trang
Làm theo nhóm, mỗi nhóm một commit:
- Thay 31 `<button>` và 9 `<input>` thô bằng `Button`, `IconButton`, `Input`, `Field`.
- Thay spinner tự viết bằng `Button loading`.
- Thay link tự tạo kiểu bằng `ButtonLink`.
- Thay map trạng thái bằng `StatusBadge`.

Ba nhóm: (a) đăng nhập và `/em/*`, (b) cô giáo nhóm 1: tổng quan, học sinh, điểm danh, thi đua, xếp hạng, (c) cô giáo nhóm 2: các trang còn lại và trình chiếu. Ba nhóm độc lập về file nên có thể chạy song song.

### Bước 4. Gom khung trang
- `Header` và `StudentHeader` dùng chung `PageHeaderShell`. Phần khác nhau truyền qua slot: lớp/ngày, nút xem như học sinh, tên học sinh.
- `Sidebar` và `StudentNav` dùng chung `NavPill` (ô icon pastel và trạng thái đang chọn).
- Hai layout `(teacher)` và `em` dùng chung `AppShell`: skip link, `RouteFocus`, `ThemeBodyVars`, khung flex.
- Ràng buộc: không đổi thứ tự DOM `aside` → `nav` → `ul`, giữ 14 link và `aria-current`.

### Bước 5. Tách file client lớn
Không đổi hành vi, chỉ tách thành component và hook trong cùng thư mục:
- `StarsClient` (641 dòng): `StudentPicker`, `ActionPanel`, `BatchHistory`, hook `useUndoAward`.
- `SettingsClient` (491): mỗi nhóm cài đặt một section, cộng `ThemePicker`.
- `DataSection` (440): `BackupCard`, `RestoreCard`, `DangerZone`.
- `MissionsClient` (422): `MissionForm`, `MissionList`, `AwardDialog`.
- Mục tiêu: không file nào quá khoảng 300 dòng.

### Bước 6. Khôi phục e2e
- Bật Supabase cục bộ (`pnpm supabase start`).
- Sửa 13 spec theo `docs/E2E-SAU-REDESIGN.md`: màu RGB mới, `dialog` thay `alertdialog`, các bước xác nhận mới, bố cục menu học sinh dưới `lg`.
- Thêm e2e cho hành vi mới: nhóm menu cô giáo, thanh tab đáy và "Thêm", Hoàn tác ở `/thi-dua`, "Xem như học sinh" và dải xem thử, hiện/ẩn mật khẩu, nhớ tab đăng nhập, tiến độ "Còn N sao nữa".
- Chạy `pnpm test:e2e` trên cả 3 khổ (375, 768, 1280) đến khi xanh.

### Bước 7. Đồng bộ tài liệu
- Viết lại `design-system/tram-khong-gian/MASTER.md` theo bảng màu và token thật (hiện vẫn là bảng mặc định của skill).
- Cập nhật `design/HANDOFF.md`: palette, thành phần, quy tắc dùng `Button`/`ButtonLink`/`IconButton`/`StatusBadge`.
- Xóa `docs/E2E-SAU-REDESIGN.md` khi e2e đã xanh.

## Thứ tự và song song
0 → 1 → 2 làm tuần tự. Bước 3 chạy song song 3 nhóm. Sau đó 4 → 5, rồi 6 → 7. Bước 5 có thể chạy song song với 6 nếu chia file rõ ràng.

## Kiểm chứng sau mỗi bước
- `pnpm exec tsc --noEmit`, `pnpm exec eslint app components lib tests`, `pnpm test`.
- Sau bước 3, 4, 5: `pnpm build` và xem nhanh bằng trình duyệt ở 375/768/1280. So ảnh chụp trước và sau ở các trang chính để chắc giao diện không đổi.
- Sau bước 6: `pnpm test:e2e` xanh.
- Đo lại bảng số liệu ở đầu tài liệu. Mục tiêu: hex trong className bằng 0 (ngoài danh sách cho phép), spinner tự viết bằng 0, `<button>` thô chỉ còn trong `components/ui`.

## Rủi ro
- Làm tròn bán kính 14 và 18 có thể làm vài chỗ lệch nhẹ. Cách xử lý: so ảnh chụp ở bước 2 và giữ token riêng nếu thấy khác rõ.
- `SegmentedTabs` thay tab đăng nhập có thể làm vỡ `tests/e2e/helpers.ts`. Cách xử lý: giữ đúng role và nhãn.
- Tách `StarsClient` dễ làm vỡ luồng hoàn tác. Cách xử lý: thêm unit test cho `useUndoAward` trước khi tách.
