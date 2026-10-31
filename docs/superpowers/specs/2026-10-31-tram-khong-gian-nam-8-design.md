# Trạm không gian Năm 8: Spec triển khai

Ngày: 2026-10-31 · Trạng thái: chờ duyệt

## 1. Mục tiêu

Biến bộ thiết kế trong `design/` thành website quản lý lớp chạy thật cho lớp 5/8, Trường Tiểu học Chính Nghĩa (cô Khanh, năm học 2026 – 2027), và dùng lại được cho các năm học, các lớp sau.

**Người dùng đã nói:**
- Làm đầy đủ cả 15 màn hình giáo viên và trang học sinh trước khi chạy thật.
- Dùng project Supabase có sẵn của người dùng; triển khai lên Vercel (có thể gắn tên miền riêng).
- Hiện tại dùng cho lớp 5/8; năm sau dùng lại cho lớp khác.
- Lập kế hoạch và review bằng Opus, viết code bằng Sonnet.

**Giả định (đã trình bày, người dùng không phản đối):**
- Một giáo viên quản trị; mỗi năm học là một bản ghi `classes`. Không làm đa trường, đa giáo viên, nhưng mọi bảng có `class_id`.
- Đăng nhập bằng tên đăng nhập + mật khẩu; học sinh không có email thật.

**Thành công khi:**
- Mọi màn hình trong `design/project/*.dc.html` có bản thật, khớp bố cục, màu, chữ tiếng Việt và hành vi của thiết kế, chạy trên 375px, 768px, 1280px.
- Mọi quy tắc nghiệp vụ ở mục 4 HANDOFF.md và mục 5 dưới đây được bảo đảm ở cơ sở dữ liệu (hàm Postgres + RLS), có test.
- Cô Khanh đăng nhập trên Vercel, tạo tài khoản học sinh, và học sinh đăng nhập được.

## 2. Nguồn sự thật

- `design/HANDOFF.md`: quy tắc nghiệp vụ, phân quyền, phong cách. Spec này bổ sung, không thay thế.
- `design/project/*.dc.html`: bản vẽ chi tiết từng màn hình. Đọc như bản vẽ; không chạy được độc lập. Viết lại bằng React.
- `design/assets/`: ảnh thật. Bảng đổi đường dẫn `/_blob/...` ở mục 1 HANDOFF.md.
- Chỗ nào thiết kế và spec mâu thuẫn: theo spec ở phần dữ liệu và quyền, theo thiết kế ở phần giao diện.

## 3. Kiến trúc

| Lớp | Công nghệ |
|---|---|
| Giao diện | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 |
| Dữ liệu, Auth, Storage | Supabase (Postgres, Auth, RLS, Storage) qua `@supabase/ssr` |
| Ghi dữ liệu | Server Actions gọi hàm Postgres (`rpc`) hoặc truy vấn đã được RLS bảo vệ |
| Nhập/xuất file | SheetJS (`xlsx`) cho Excel/CSV |
| Test | Vitest (logic TS), pgTAP hoặc SQL test qua Supabase CLI (hàm và RLS), Playwright (luồng chính, ảnh chụp 3 cỡ màn hình) |
| Triển khai | Vercel; Supabase project của người dùng |

### 3.1 Cấu trúc thư mục

```
app/
  (auth)/dang-nhap/            Login
  (teacher)/                   layout có Sidebar + Header, chỉ role teacher
    tong-quan/                 Main
    hoc-sinh/                  Students
    diem-danh/                 Attendance
    thi-dua/                   Stars
    xep-hang/                  Leaderboard
    doi-qua/                   Rewards
    goi-ten/                   Random
    thoi-khoa-bieu/            Timetable
    thong-bao/                 Announcements
    nhiem-vu/                  Missions
    bao-cao/                   Reports
    cai-dat/                   Settings
    ho-so/                     Profile
  trinh-chieu/                 Display (toàn màn hình, không Sidebar)
  em/                          Student, layout menu học sinh
    (trang-chu, sao, xep-hang, doi-qua, thoi-khoa-bieu, diem-danh, thong-bao)
components/ui/                 Button, Card, Toggle, Modal, Tabs, Badge, StarBurst...
components/layout/             Sidebar, Header, StudentNav
components/avatar/             Avatar (SVG chibi + ảnh tải lên)
lib/supabase/                  client, server, admin (service role, chỉ server)
lib/auth/                      username <-> email ẩn, kiểm tra role
lib/domain/                    kiểu dữ liệu, tính kỳ (tuần/tháng/học kỳ/năm)
supabase/migrations/           SQL schema, view, hàm, RLS, seed
supabase/tests/                test SQL
tests/e2e/                     Playwright
```

Đường dẫn URL tiếng Việt không dấu. Tên trang menu đúng như Sidebar trong thiết kế.

### 3.2 Phong cách (token Tailwind)

Lấy từ mục 3 HANDOFF.md: `primary #6675E8`, `primary-strong #4F5BD5` (nút chính), `lavender #B9A7F8`, `pink #F46FA5`, `star #FFC857`, `mint #80DDD0`, `bg #F6F4FF`, `ink #231F4D`, navy gradient `#25286A → #33378F`. Bo thẻ 22–28px. Phông Baloo 2 (tiêu đề, số) và Nunito (nội dung) qua `next/font/google` với subset `vietnamese`. Nút tối thiểu 44px. Icon là SVG nét (lấy path từ thiết kế), không emoji.

Màu chủ đạo đổi được trong Cài đặt (4 lựa chọn: Xanh tím `#6675E8`, Hồng sen `#F46FA5`, Xanh mint `#2BB5A4`, Vàng sao `#F5A81C`): áp dụng bằng CSS variable `--primary` đặt ở layout từ `classes.theme`.

Trên màn ≤760px, Sidebar thành hàng cuộn ngang và ẩn khối chân menu (như CSS trong `Sidebar.dc.html`).

### 3.3 Xác thực

- Tên đăng nhập (ví dụ `co.khanh`, `hs.minhanh`) map sang email ẩn `<username>@tram58.local` (hằng số cấu hình `AUTH_EMAIL_DOMAIN`). Người dùng không bao giờ thấy email này.
- Trang Đăng nhập có tab Giáo viên / Học sinh như thiết kế; tab chỉ đổi nhãn và chuyển hướng sau đăng nhập. Role thật lấy từ `profiles.role`.
- Tài khoản giáo viên đầu tiên tạo bằng script seed (`scripts/create-teacher.ts`) chạy với service role; mật khẩu nhập qua biến môi trường lúc chạy, không lưu trong repo.
- Tạo tài khoản học sinh hàng loạt và đặt lại mật khẩu: Server Action dùng service role (`lib/supabase/admin.ts`, chỉ import ở server), chỉ chạy khi người gọi là teacher. Mật khẩu tạm sinh ngẫu nhiên, hiện một lần trên màn hình để cô in/ghi lại, không lưu.
- Middleware: chưa đăng nhập → `/dang-nhap`; student vào khu giáo viên → `/em`; teacher vào `/em` được phép (xem thử).
- Tắt đăng ký công khai trong Supabase Auth.

## 4. Dữ liệu

Mọi bảng (trừ `classes`, `profiles`, `audit_logs`) có `class_id uuid not null references classes`, `created_at`, `is_demo boolean default false`. Khóa chính `uuid` mặc định `gen_random_uuid()`. Chỉ mục trên mọi khóa ngoại và trên `(student_id, created_at)` của các bảng sổ cái.

| Bảng | Cột chính |
|---|---|
| `classes` | school_name, class_name, school_year, teacher_name, slogan, logo_path, class_logo_path, cover_path, theme, term1_start, term1_end, term2_start, term2_end, archived_at |
| `profiles` | id (= auth.users.id), class_id, role (`teacher`/`student`), username unique, student_id null |
| `students` | code (HS01…), roll_no, full_name, avatar_id, archived_at |
| `groups` | name, sort_order |
| `group_members` | group_id, student_id unique theo class, role (`leader`/`deputy`/`member`) |
| `star_criteria` | label, kind (`award`/`penalty`), default_points, sort_order, archived_at |
| `star_transactions` | student_id, delta int ≠ 0, kind (`award`/`penalty`/`reserve`/`release`/`redeem`/`reversal`), criterion_id null, note, reward_request_id null, reverses_id null unique, actor_id, created_at |
| `rewards` | name, cost, description, image_path hoặc icon preset, stock, hidden |
| `reward_requests` | student_id, reward_id, cost (chốt lúc gửi), status (`pending`/`approved`/`rejected`/`delivered`), decided_by, decided_at, delivered_at |
| `attendance` | student_id, date, status (`present`/`absent_unexcused`/`absent_excused`/`late`), note; unique (student_id, date) |
| `subjects` | name, color, sort_order |
| `timetable_slots` | weekday 1–6, session (`morning` 1–5 / `afternoon` 1–3), period, subject_id null; unique (class_id, weekday, session, period) |
| `announcements` | title, type, body, image_path, pinned, published_at, archived_at |
| `missions` | name, period (`week`/`month`), condition, reward_stars, active |
| `mission_completions` | mission_id, student_id, star_transaction_id null; unique (mission_id, student_id, period_key) |
| `badges` | name, icon, gradient |
| `student_badges` | badge_id, student_id, awarded_by; unique (badge_id, student_id) |
| `avatar_library` | kind (`preset`/`upload`), preset jsonb (hair, hairColor, skin, bg) hoặc image_path, label, hidden |
| `class_settings` | một dòng mỗi lớp: các cờ ở mục 4.3, weekly_redeem_limit, star_steps int[] |
| `audit_logs` | actor_id, action, entity, entity_id, payload jsonb |

### 4.1 View tính sao

- `v_student_stars(student_id, competition_stars, available_stars)`:
  - `competition_stars` = tổng `delta` của `award`, `penalty` và `reversal` đảo các giao dịch đó.
  - `available_stars` = tổng `delta` của mọi loại. `reserve`, `redeem` âm; `release` dương.
- `competition_stars_between(class_id, from, to)`: hàm trả bảng xếp hạng một kỳ, dùng `rank() over (order by stars desc)` nên bằng điểm thì cùng hạng.
- Kỳ: tuần (thứ Hai – Chủ nhật, giờ `Asia/Ho_Chi_Minh`), tháng, học kỳ (theo ngày cô đặt), năm học.
- `v_leaderboard_public`: chỉ trả student_id, họ tên, avatar, số sao thi đua. Học sinh đọc bảng xếp hạng qua view này.

### 4.2 Hàm Postgres

Tất cả `security definer`, `set search_path = ''`, kiểm tra role của `auth.uid()` ở đầu hàm, khóa dòng bằng `FOR UPDATE` khi cần, ghi `audit_logs`.

| Hàm | Ai gọi | Quy tắc |
|---|---|---|
| `award_stars(student_ids[], points, criterion_id, note)` | teacher | points > 0; một giao dịch mỗi học sinh |
| `penalize_stars(student_ids[], points, criterion_id, note)` | teacher | Nếu bất kỳ học sinh nào có `available_stars < points` thì báo lỗi kèm danh sách, không ghi gì |
| `reverse_transaction(tx_id)` | teacher | Chỉ cho `award`/`penalty`; tạo `reversal` với delta đảo dấu; `reverses_id` unique nên không hoàn tác hai lần. Hoàn tác một lần cộng sao mà làm `available_stars` âm thì báo lỗi |
| `request_reward(reward_id)` | student | Tính năng đổi quà bật; quà không ẩn; `stock − số đang giữ > 0`; nếu `only_enough` bật thì `available_stars ≥ cost`; chưa vượt `weekly_redeem_limit`. Tạo `reward_requests` pending; nếu `reserve` bật thì thêm `reserve` −cost |
| `approve_reward_request(id)` | teacher | Chỉ khi pending. Kiểm tra lại số dư và tồn kho. Đổi `reserve` thành `release` + `redeem` (hoặc chỉ `redeem` nếu không giữ trước); giảm `stock` |
| `reject_reward_request(id)` | teacher | Chỉ khi pending; thêm `release` nếu đã giữ |
| `deliver_reward_request(id)` | teacher | Chỉ khi approved |
| `save_attendance(date, rows jsonb)` | teacher | Upsert theo (student_id, date) |
| `complete_mission(mission_id, student_id)` | teacher | Ghi completion; nếu reward_stars > 0 gọi logic award với note "Nhiệm vụ: …" |
| `set_my_avatar(avatar_id)` | student | Chỉ khi cờ cho phép; avatar thuộc thư viện lớp, không ẩn |
| `archive_class(class_id)` / `create_class_year(...)` | teacher | Lưu trữ năm học; tạo năm mới, tùy chọn chép môn, tiêu chí, quà, thư viện avatar |

Nếu `require_approval` tắt: `request_reward` chuyển thẳng sang approved trong cùng giao dịch.

### 4.3 Cờ trong `class_settings`

Lấy từ `Settings.dc.html`: `require_approval`, `reserve_on_request`, `only_enough`, `feature_missions`, `feature_random`, `feature_display`, `feature_rewards`, `student_can_view_profile`, `student_can_view_history`, `student_can_view_rank`, `student_can_view_rewards`, `student_can_view_timetable`, `student_can_view_news`, `student_can_view_attendance` (mặc định tắt), `student_can_change_avatar`, `weekly_redeem_limit` (mặc định 2), `star_steps` (mặc định {1,2,3,5,10}).

### 4.4 RLS

- Bật RLS trên mọi bảng. Hàm trợ giúp `is_teacher(class_id)`, `my_student_id()` (`security definer`, `stable`).
- Teacher: select/insert/update trên mọi bảng của lớp mình; không có policy delete cho `star_transactions`, `reward_requests`, `students`, `audit_logs`.
- Student: chỉ select dòng của chính mình trong `students`, `star_transactions` (ẩn cột `note` và `criterion_id` của giao dịch `penalty` qua view `v_my_star_history`), `reward_requests`, `student_badges`, `attendance` (chỉ khi cờ bật); select `rewards` không ẩn, `subjects`, `timetable_slots`, `announcements` không lưu trữ, `badges`, `avatar_library`, `classes`, `class_settings` của lớp mình. Mỗi policy kiểm tra cờ tương ứng.
- Student không có quyền insert/update trực tiếp bảng nào; mọi ghi đi qua `request_reward` và `set_my_avatar`.
- Storage: bucket `class-media` (logo, bìa, quà, avatar, ảnh thông báo); teacher ghi, user đã đăng nhập cùng lớp đọc.

## 5. Màn hình

Mỗi màn hình làm theo file `.dc.html` cùng tên. Ghi chú dưới đây chỉ nêu phần nối dữ liệu và các nút mà thiết kế chỉ vẽ (mục 7 HANDOFF.md).

| Màn hình | Ghi chú triển khai |
|---|---|
| Login | Logo trường + logo lớp, ảnh 3 bạn nhỏ trong suốt. Báo lỗi sai tên/mật khẩu bằng tiếng Việt |
| Main | Thẻ số liệu, Top 3, hoạt động gần đây (10 giao dịch mới nhất), thông báo; ảnh bìa từ `classes.cover_path`, không có thì dùng hình vẽ sẵn |
| Students | Tìm, sắp xếp, lọc, xem theo tổ; thêm/sửa/lưu trữ học sinh; đặt tổ trưởng/tổ phó, chuyển tổ; hồ sơ (lịch sử sao, đổi quà); nhập Excel/CSV có file mẫu và bước xem trước; xuất Excel |
| Stars | Chọn một/nhiều bạn, cả tổ, cả lớp; cộng/trừ với mức từ `star_steps` hoặc tùy chỉnh; tiêu chí; hộp xác nhận khi trừ; animation ngôi sao khi cộng; lịch sử có nút hoàn tác; quản lý tiêu chí |
| Leaderboard | Tab tuần/tháng/học kỳ/năm; bục vinh danh; Top 5, nút xem cả lớp |
| Rewards | Lưới quà, thêm/sửa/ẩn quà, tải ảnh hoặc chọn hình có sẵn; hàng yêu cầu với Duyệt/Từ chối/Đã trao |
| Random | Phạm vi cả lớp hoặc theo tổ; chế độ không lặp trong vòng; +1 sao gọi `award_stars`; trạng thái vòng giữ ở client |
| Timetable | Lưới thứ Hai – Sáu (bật thêm thứ Bảy), 5 tiết sáng, 3 tiết chiều, không hiện giờ; sửa ô; quản lý môn (không xóa môn đang dùng); sao chép từ năm trước; In (CSS print) và xuất Excel |
| Attendance | Chọn ngày (mặc định hôm nay), 4 trạng thái, "Tất cả có mặt" chỉ điền trên màn hình, chỉ lưu khi bấm Lưu; lịch sử theo ngày có Chỉnh sửa; thêm lịch tháng và xuất CSV |
| Announcements | Tạo/sửa/lưu trữ, loại, ghim, đính kèm một ảnh |
| Missions | Bật/tắt tính năng; tạo nhiệm vụ; ghi nhận hoàn thành cho học sinh; huy hiệu và trao huy hiệu |
| Reports | Kỳ tuần/tháng/học kỳ/năm hoặc khoảng ngày; KPI, biểu đồ cộng/trừ, chuyên cần, vắng nhiều, tiêu chí thường gặp, tiến bộ, quà đã đổi; xuất CSV/Excel |
| Profile | Chọn người, thư viện avatar (preset chibi + ảnh tải lên), tải avatar, công tắc cho học sinh tự đổi |
| Settings | Thông tin lớp; logo, bìa, màu; quy định đổi quà; cờ tính năng; quyền xem của học sinh; tài khoản học sinh (tạo hàng loạt, đặt lại mật khẩu); năm học và dữ liệu (lưu trữ, tạo năm mới, sao lưu JSON, khôi phục vào năm mới, xóa dữ liệu demo) |
| Display | Toàn màn hình, nền navy; Top 5, sao sáng trong tuần, thành tích nổi bật (tính từ dữ liệu), tiết học hôm nay, thông báo ghim; tự động chuyển khối 15 giây (bật/tắt); không hiện tài khoản, điểm danh, lý do trừ sao, nút quản trị |
| Student (`/em/*`) | 7 trang theo menu; trang nào cờ tắt thì ẩn khỏi menu và trả 404; đổi quà có hộp xác nhận; lịch sử sao không hiện lý do trừ |

**Dữ liệu demo:** seed 10 học sinh mẫu như thiết kế, đánh dấu `is_demo = true` trên các dòng seed để "Xóa dữ liệu demo" chỉ xóa chúng. Môi trường production không tự seed demo; cô bấm "Tạo dữ liệu mẫu" nếu muốn.

## 6. Xử lý lỗi

- Hàm Postgres ném lỗi có mã (`P0001` + message key, ví dụ `insufficient_stars`, `out_of_stock`, `already_processed`, `weekly_limit`). Server Action map key sang câu tiếng Việt thân thiện và hiển thị ở vùng `{{err}}`/`{{msg}}` như thiết kế.
- Nút gửi bị khóa trong lúc chờ; dữ liệu làm mới bằng `revalidatePath` sau khi ghi.
- Tải ảnh: giới hạn 5 MB, chỉ jpg/png/webp, nén trước khi tải.
- Trang lỗi và trang 404 bằng tiếng Việt theo phong cách chung.

## 7. Kiểm thử

- **SQL:** mỗi hàm ở 4.2 có test cho đường thành công và từng mã lỗi. Bắt buộc: trừ vượt số dư bị chặn; hoàn tác hai lần bị chặn; duyệt một yêu cầu hai lần bị chặn; hai yêu cầu cùng lúc cho món quà cuối chỉ một thành công; từ chối trả đúng số sao.
- **RLS:** đăng nhập bằng hai học sinh, xác nhận không đọc được sao, lịch sử, yêu cầu đổi quà, điểm danh của nhau; không đọc được lý do trừ sao; không insert/update trực tiếp được; cờ tắt thì không đọc được.
- **Vitest:** tính kỳ (tuần/tháng/học kỳ theo giờ Việt Nam), map username/email, map lỗi, parse file Excel nhập.
- **Playwright:** đăng nhập giáo viên → cộng sao → hoàn tác; học sinh gửi đổi quà → giáo viên duyệt → học sinh thấy trạng thái; điểm danh lưu và sửa ngày trước; chụp mọi trang ở 375, 768, 1280px.
- Opus review mỗi đợt trước khi sang đợt sau.

## 8. Triển khai

1. Phát triển với Supabase local (`supabase start`).
2. Cuối đợt 6: chạy migration lên project Supabase của người dùng (qua Supabase MCP hoặc `supabase db push`), cấu hình Auth (tắt đăng ký, tắt xác nhận email), tạo bucket, tạo tài khoản giáo viên.
3. Tạo project Vercel, đặt biến môi trường `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_EMAIL_DOMAIN`. Người dùng tự nhập khóa vào Vercel.
4. Người dùng duyệt bản preview trước khi gắn tên miền và dùng thật.

## 9. Thứ tự làm

| Đợt | Nội dung |
|---|---|
| 1. Nền tảng | Khởi tạo Next.js, Tailwind token, phông, Supabase client, toàn bộ schema + RLS + seed, Auth, middleware, Sidebar, Header, Avatar, Login, Profile |
| 2. Học sinh và sao | Students, Stars, Leaderboard, Main và các hàm sao |
| 3. Đổi quà | Rewards và các hàm đổi quà |
| 4. Lớp hằng ngày | Attendance, Timetable, Announcements |
| 5. Tương tác | Missions, Random, Display, toàn bộ `/em` |
| 6. Quản trị và chạy thật | Settings, Reports, nhập/xuất, sao lưu, năm học, deploy |

Mỗi đợt có plan riêng trong `docs/superpowers/plans/`.

## 10. Ngoài phạm vi

- Nhiều giáo viên hoặc nhiều lớp cùng lúc trong một năm; tài khoản phụ huynh.
- Thông báo đẩy, email, tin nhắn.
- Ứng dụng di động riêng; chế độ offline.
- Tự động chấm nhiệm vụ.
