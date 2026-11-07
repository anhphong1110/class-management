# Trạm không gian Năm 8: gói bàn giao thiết kế

Website quản lý lớp 5/8, Trường Tiểu học Chính Nghĩa, cô Khanh, năm học 2026 – 2027.
Slogan: Cùng học – Cùng chơi – Cùng tỏa sáng.

## 1. Gói này có gì

- `project/*.dc.html`: 19 file = 15 màn hình giáo viên + 1 màn hình học sinh (Student) + 3 thành phần dùng chung (Sidebar, Header, Avatar). Đây là HTML tham chiếu, có dữ liệu demo cố định.
- `project/canvas.json`: sơ đồ canvas (vị trí, tên từng màn hình). Chỉ dùng để xem lại trên canvas thiết kế.
- `assets/`: logo trường, logo lớp, ảnh 3 bạn nhỏ.
- Bản xem trực tiếp, bấm được: mở artifact thiết kế trên claude.ai (link cô đã dùng). Các file `.dc.html` KHÔNG chạy độc lập bằng cách mở trong trình duyệt: chúng dùng cú pháp mẫu của công cụ thiết kế (`{{ }}`, `<sc-for>`, `<sc-if>`, `<dc-import>`, `class Component extends DCLogic`) và `./support.js` do công cụ cung cấp.
- Khi code: đọc các file này như bản vẽ chi tiết (bố cục, màu, chữ, chữ tiếng Việt, hành vi), rồi viết lại bằng React/Next.js.

### Ảnh trong thiết kế
Trong file `.dc.html`, ảnh được gọi bằng đường dẫn tạm của công cụ. Khi code hãy thay bằng file trong `assets/`:

| Đường dẫn trong thiết kế | File thật |
|---|---|
| `/_blob/c29022907dd1206cfc9cde75f5d232a6` | `assets/logo-truong-chinh-nghia.jpg` (logo trường, dùng ở menu và trang Đăng nhập, cắt tròn) |
| `/_blob/5910f6622b2803abde4a3d501b5377dc` | `assets/anh-3-ban-nho-trong-suot.png` (ảnh 3 bạn nhỏ, nền trong suốt, ở Đăng nhập) |
| (chưa dùng) | `assets/logo-lop-5-8-team-co-khanh.jpg` (logo lớp: dự kiến thay hình hành tinh cạnh chữ "Trạm không gian Năm 8" trong menu) |
| (không dùng nữa) | `assets/anh-3-ban-nho-goc.jpg` (ảnh gốc có nền xanh) |

Avatar học sinh và giáo viên trong thiết kế là hình SVG chibi vẽ sẵn (`Avatar.dc.html`). Bản thật theo yêu cầu: giáo viên tải avatar lên thư viện lớp, học sinh chỉ chọn trong thư viện.

## 2. Màn hình và file

Giáo viên: Login, Main (Tổng quan), Students (Quản lý học sinh + chia tổ), Attendance (Điểm danh), Stars (Trạm thi đua), Leaderboard (Bảng xếp hạng), Rewards (Trạm đổi quà), Timetable (Thời khóa biểu), Announcements (Thông báo), Missions (Nhiệm vụ và huy hiệu), Reports (Thống kê – Báo cáo), Random (Gọi tên ngẫu nhiên), Profile (Hồ sơ và avatar), Settings (Cài đặt), Display (Chế độ trình chiếu).
Học sinh: Student (một file, chuyển trang bằng menu: Trang chủ, Sao của em, Bảng xếp hạng, Đổi quà, Thời khóa biểu, Điểm danh của em, Thông báo).
Dùng chung: Sidebar (menu giáo viên), Header (thanh đầu trang), Avatar.

## 3. Phong cách

Cập nhật 07/11/2026: giao diện Claymorphism nhẹ, xanh trời. Nguồn chuẩn là `design-system/tram-khong-gian/MASTER.md` và `app/globals.css`.

- Màu mặc định (khóa `indigo`, nhãn "Xanh trời"): chính `#4DA3FF`, nút chính `#2563EB` (chữ trắng đạt 5,2:1), nhạt `#E0EEFF`, mực `#1D4ED8`, đậm `#1E40AF`, nền trang `#EEF7FF`, viền `#CFE3FF`. Điểm nhấn: vàng sao `#FFC93C`, hồng kẹo `#FF6FAE`, mint `#5EDCC5`, cam `#FF9F43`. Ba chủ đề còn lại (hồng sen, mint, vàng sao) giữ nút chính cũ, đổi nền và viền pastel tương ứng. Màu theo lớp nằm trong `lib/domain/theme.ts`.
- Kiểu "đất sét": viền 2px, gờ đáy 4px, bo `chip` 12 / `ctl` 16 / `panel` 20 / `card` 24, lún 3px khi bấm (`.clay-press`, `.clay-card`, `.clay-field`). Tắt chuyển động khi `prefers-reduced-motion`.
- Chữ: Baloo 2 (tiêu đề, số), Nunito (nội dung, tối thiểu 16px). Cả hai hỗ trợ tiếng Việt.
- Thành phần dùng chung (`components/ui`): `Button` (có `loading`), `ButtonLink`, `IconButton`, `SegmentedTabs`, `Input`/`Field`, `Card`, `Modal`, `ConfirmDialog`, `Notice`, `UndoToast`, `Badge`, `StatCard`, `EmptyState`, `ProgressBar`, `Skeleton`, `Icon`. Quy tắc: không dùng `<button>` tùy kiểu cho nút thường, không gõ hex trong className (có test chặn `tests/unit/hex-guard.test.ts`), dùng token bán kính và bóng đổ.
- Khung trang: `AppShell`, `PageHeaderShell`, `Sidebar` (menu cô giáo chia nhóm), `StudentNav` (thanh bên từ `lg`, thanh tab đáy dưới `lg`).
- Nút bấm tối thiểu cao 44px (học sinh 48 – 52px). Trang đăng nhập và trình chiếu giữ nền navy.
- Không dùng emoji làm hình; icon là SVG nét.

## 4. Quy tắc nghiệp vụ

Sao có hai chỉ số, tính từ bảng giao dịch (không lưu một con số sửa tay):
- Sao thi đua tích lũy: dùng xếp hạng, báo cáo, huy hiệu. Không bị trừ khi đổi quà. Cộng khi cộng sao, trừ khi trừ sao vi phạm.
- Sao khả dụng = sao nhận được − sao bị trừ − sao đã đổi quà ± điều chỉnh hợp lệ. Không bao giờ âm. Trừ quá số dư thì cảnh báo, không tạo số âm.
- Mọi thay đổi ghi: học sinh, số sao, cộng hay trừ, lý do (tiêu chí và/hoặc ghi chú), ngày giờ, người thực hiện.
- Hoàn tác = thêm một giao dịch đảo ngược, không xóa giao dịch cũ.
- Trừ sao cần hộp xác nhận. Cộng sao có animation ngôi sao.
- Cộng sao được cho một bạn, nhiều bạn, cả tổ hoặc cả lớp.

Bảng xếp hạng: theo sao thi đua trong tuần/tháng/học kỳ/năm. Bằng điểm thì cùng hạng. Mặc định Top 5, mở rộng xem cả lớp.

Đổi quà: học sinh chọn quà → hệ thống kiểm tra sao khả dụng và tồn kho → học sinh gửi yêu cầu → giữ trước sao và quà → giáo viên duyệt (trừ sao chính thức, giảm tồn kho) hoặc từ chối (trả lại sao và quà) → giáo viên đánh dấu đã trao. Một yêu cầu không xử lý hai lần. Dùng giao dịch cơ sở dữ liệu để tránh trừ sao hai lần hoặc bán vượt số lượng quà.

Điểm danh: bốn trạng thái (Có mặt, Vắng không phép, Vắng có phép, Đi trễ). Không tự đánh dấu có mặt khi cô chưa lưu. Sửa được ngày trước.

Học sinh: tổ có tổ trưởng và tổ phó (chỉnh được). Không xóa vĩnh viễn học sinh, ưu tiên lưu trữ. Dữ liệu mỗi năm học lưu riêng.

Thời khóa biểu: 5 tiết sáng, 3 tiết chiều, thứ Hai đến thứ Sáu (hỗ trợ thêm thứ Bảy). Không hiển thị giờ từng tiết. Danh sách môn do giáo viên sửa (tên, màu, thêm, xóa; môn đang dùng thì chưa xóa được).

## 5. Phân quyền

Giáo viên (admin): toàn quyền.
Học sinh chỉ: xem hồ sơ và sao của mình, lịch sử sao của mình, bảng xếp hạng, quà và gửi yêu cầu đổi quà, thời khóa biểu, thông báo, huy hiệu của mình, và (nếu cô bật) lịch sử điểm danh của mình, tự đổi avatar trong thư viện.
Học sinh không bao giờ: thấy quản trị, lý do trừ sao hay dữ liệu của bạn khác, sửa dữ liệu, tự cộng/trừ sao, tự duyệt quà.
Cài đặt có công tắc bật/tắt từng trang học sinh được xem và từng tính năng (nhiệm vụ, gọi tên ngẫu nhiên, trình chiếu, đổi quà).
Quyền phải kiểm tra ở backend và cơ sở dữ liệu (Row Level Security), không chỉ ẩn nút.
Chế độ trình chiếu không hiện tài khoản, điểm danh, lý do trừ sao riêng tư hay nút quản trị.

## 6. Gợi ý dữ liệu

Bảng tối thiểu: classes, users, students, groups (tổ) + group_members (vai trò), attendance, star_criteria, star_transactions, rewards, reward_reservations, reward_redemptions, timetable_slots + subjects, announcements, missions, badges, student_badges, settings, audit_logs.
Tổng sao và thứ hạng tính từ star_transactions (view hoặc hàm), có chỉ mục theo học sinh và ngày.
Công nghệ đề xuất: Next.js, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS, Storage cho logo, ảnh quà, avatar), triển khai Vercel. Mật khẩu học sinh do hệ thống xác thực quản lý, không bao giờ hiển thị.

## 7. Thiết kế đã làm nhưng chỉ là hình

Các nút sau trong thiết kế chưa có hành vi thật (cần làm khi code): Thêm học sinh, Nhập/Xuất Excel/CSV, Thêm phần thưởng, Thêm tiêu chí, Chọn ngày, tải ảnh/avatar/logo lên, đính kèm hình thông báo, Sao chép/In thời khóa biểu, xuất báo cáo CSV/Excel, sao lưu/khôi phục, lưu trữ năm học, xóa dữ liệu demo, tạo tài khoản hàng loạt, đặt lại mật khẩu.
Số liệu trên mọi màn hình là dữ liệu demo cố định (10 học sinh mẫu), thay đổi trên màn hình mất khi tải lại.

## 8. Chưa quyết hoặc chưa kiểm tra

- Chưa kiểm tra hiển thị thật trên điện thoại và máy tính bảng.
- Logo lớp chưa đặt vào đâu; trang Đăng nhập hiện chỉ có logo trường.
- Ảnh bìa lớp (khối chào ở Tổng quan) hiện là hình vẽ sẵn, cần nối với ảnh bìa cô tải lên trong Cài đặt.
- Lịch sử điểm danh theo tháng dạng lịch và xuất báo cáo điểm danh chưa thiết kế riêng.
- Chế độ trình chiếu chưa có tự động luân phiên các khối.
