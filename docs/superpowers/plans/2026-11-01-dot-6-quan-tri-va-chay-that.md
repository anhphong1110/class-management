# Đợt 6: Quản trị và chạy thật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đợt này làm Cài đặt, Báo cáo, tài khoản học sinh, sao lưu/khôi phục, năm học mới và xóa dữ liệu demo, rồi đưa dự án tới trạng thái "sẵn sàng triển khai". Đợt này không deploy.

**Architecture:**
- Mọi ghi quản trị đi qua hàm Postgres `security definer`, có kiểm tra quyền và ghi `audit_logs`.
- Những việc cần Auth admin (tạo tài khoản, đặt lại mật khẩu, khóa đăng nhập, xóa tài khoản demo, chép file ảnh) chạy trong Server Action dùng `lib/supabase/admin.ts`, sau `requireTeacher()`.
- Mỗi năm học là một dòng `classes`. Lưu trữ năm học gồm ba việc: tạo lớp mới, đóng lớp cũ, chuyển hồ sơ giáo viên sang lớp mới.
- Năm cũ chỉ còn tải được bản sao lưu.

**Tech Stack:** Next.js 15, React 19, Tailwind v4, Supabase (Postgres 17, Auth, Storage), SheetJS 0.20.3 (vendored), Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-tram-khong-gian-nam-8-design.md`. Các mục liên quan: §3.3, §4.2 (`archive_class` / `create_class_year`), §4.3, §5 (Settings, Reports), §8. Thêm `design/HANDOFF.md`, `design/project/Settings.dc.html`, `design/project/Reports.dc.html`.

## Global Constraints

- Mọi Global Constraints của đợt 1–5 vẫn áp dụng:
  - Hàm `security definer` và `set search_path=''`.
  - Không cấp EXECUTE cho PUBLIC/anon; grant cho `authenticated` thì ghi rõ.
  - Thứ tự khóa: `students` (`FOR NO KEY UPDATE`, không bao giờ `FOR UPDATE`) → `rewards` → `reward_requests`; `groups` → `group_members`.
  - Sổ sao chỉ thêm, không sửa.
  - Lỗi là khóa P0001, map trong `lib/errors.ts`.
  - Server Action gọi `requireTeacher()`/`requireStudent()` trước, rồi zod `z.guid()`.
  - Query lỗi thì throw.
  - Đang chờ thì khóa nút.
  - Chữ tiếng Việt chép từ thiết kế, bỏ mọi câu "Khi hệ thống chạy thật…" và "bản thiết kế".
- Migration đánh số bằng tay: `20261101000018_admin.sql`, `…0019_reports.sql`, `…0020_backup_year.sql`.
- Mật khẩu tạm 10 ký tự, lấy từ bộ chữ `abcdefghjkmnpqrstuvwxyz23456789` (bỏ ký tự dễ nhầm) bằng `crypto.randomInt`. Mật khẩu chỉ hiện một lần, không lưu, không ghi log.
- Tên đăng nhập học sinh: `hs.<givenNameKey(full_name)>`. Nếu trùng (trên toàn hệ thống) thì thêm số `2`, `3`, …. Tên phải khớp `normalizeUsername`.
- Không chạy migration lên project Supabase thật. Không tạo project Vercel. Không đặt mật khẩu giáo viên thật.
- Câu tự đặt (thiết kế không có) phải liệt kê trong report của task.

## Review Focus

1. Cô tắt thứ Bảy khi thời khóa biểu còn tiết thứ Bảy: phải hỏi trước. "Hủy" thì giữ nguyên, "Xóa và tắt" thì xóa các tiết đó rồi tắt. Test ở Task 3.
2. Tạo tài khoản hàng loạt mà một bạn lỗi giữa chừng (Auth từ chối): các bạn khác vẫn được tạo, bạn lỗi có tên trong danh sách kèm lý do, không để lại tài khoản Auth không có `profiles`. Test ở Task 4.
3. Khôi phục bằng file không phải bản sao lưu, sai phiên bản hoặc JSON hỏng: báo `'File sao lưu không hợp lệ.'`, không thay đổi gì. Test ở Task 6.
4. Mở năm học mới khi còn yêu cầu đổi quà đang chờ: các yêu cầu đó bị từ chối và trả lại sao đang giữ trong năm cũ. Học sinh năm cũ không đăng nhập được. Cô vào lớp mới, trống học sinh. Test ở Task 7.
5. Báo cáo một kỳ không có dữ liệu: mọi con số là 0, không có `NaN`/`Infinity`, biểu đồ vẫn hiện nhãn, xuất CSV/Excel vẫn được. Test ở Task 5.

---

### Task 1: Nền cơ sở dữ liệu cho quản trị (`0018_admin.sql`)

**Files:**
- Create: `supabase/migrations/20261101000018_admin.sql`, `supabase/tests/18_admin.test.sql`
- Modify: `lib/errors.ts`, `tests/unit/errors.test.ts`, `tests/e2e/helpers/ledger.ts` (nếu cần cho `deleteTestStudents`)

**Interfaces (Produces):**
- Cột mới:
  - `classes.owner_id uuid references auth.users on delete set null`. Backfill bằng giáo viên đang có `profiles.class_id = classes.id`.
  - `profiles.login_disabled boolean not null default false`.
- Check constraints:
  - `class_settings.weekly_redeem_limit between 1 and 20`.
  - `cardinality(star_steps) between 1 and 8`, mọi phần tử 1–50, không trùng.
  - `profiles`: `(role='student') = (student_id is not null)`; `username ~ '^[a-z0-9._]{3,32}$'`.
- Trigger:
  - `after insert on classes`: tự tạo dòng `class_settings` (`on conflict do nothing`).
  - `before update of archived_at on students`: chặn sửa trực tiếp `archived_at`. Chỉ `archive_student` được sửa, bằng cách đặt `set_config('app.archive_student','on',true)` trong hàm đó. Lỗi `use_archive_student`.
  - Nhật ký cho `rewards` khi insert/update: `action` = `reward_created`/`reward_updated`; `payload` ghi các cột đổi.
- `private.my_class_id()`: học sinh của lớp có `classes.archived_at is not null` nhận null, cùng cách làm với học sinh đã lưu trữ ở 0017.
- `public.save_class_info(p jsonb) returns void`: chỉ giáo viên.
  - Các key: `school_name`, `class_name`, `school_year`, `teacher_name`, `slogan` (trim, 1–120 ký tự; riêng `slogan` cho phép rỗng); `theme` (`indigo|pink|mint|gold`); `term1_start`, `term1_end`, `term2_start`, `term2_end` (date hoặc null).
  - Phải có `term1_start ≤ term1_end < term2_start ≤ term2_end` khi cả bốn có giá trị.
  - Lỗi: `invalid_input`, `invalid_term_dates`.
- `public.save_class_settings(p jsonb) returns void`: chỉ giáo viên.
  - Nhận đúng các cờ ở spec §4.3, thêm `timetable_saturday`, `weekly_redeem_limit`, `star_steps`. Key lạ thì báo `invalid_input`.
  - Bật/tắt `timetable_saturday` không đi qua hàm này; hàm từ chối với lỗi `use_set_saturday`.
  - Lỗi: `invalid_input`, `invalid_redeem_limit`, `invalid_star_steps`.
- `public.set_timetable_saturday(p_on boolean, p_clear boolean) returns int`: trả số tiết thứ Bảy đã xóa.
  - Tắt khi còn tiết thứ Bảy mà `p_clear=false` thì báo `saturday_has_slots`.
  - Tắt với `p_clear=true` thì xóa các tiết đó trong cùng giao dịch.
- `public.undo_mission_completion(p_completion_id uuid) returns void`: chỉ giáo viên, cùng lớp.
  - Xóa dòng hoàn thành. Nếu dòng đó có sao thì đảo lô sao bằng logic `reverse_batch` của 0017.
  - Lỗi: `completion_not_found`.
- `public.my_profile_summary()`: các ô số liệu trả null khi `student_can_view_profile` tắt. Lời chào và sao khả dụng vẫn trả.
- Bỏ policy `teacher_insert`/`teacher_update` trên `attendance`. Mọi ghi đi qua `save_attendance`.
- `save_attendance` từ chối ngày trước `term1_start` (khi đã đặt) với lỗi `before_school_year`.
- Rà soát lại các mục chuyển tiếp của đợt 2. Mục nào chưa có thì làm, kèm pgTAP:
  - `archive_student` trả sao đang giữ;
  - `approve_reward_request` từ chối học sinh đã lưu trữ;
  - `check_star_transaction` kiểm `reward_request.student_id = row.student_id` cho `reserve`/`release`/`redeem`.

- [ ] **Step 1: pgTAP.** Viết `18_admin.test.sql` trước. Mỗi hàm có đường thành công và từng mã lỗi. Ngoài ra:
  - thêm `classes` thì có ngay `class_settings`;
  - UPDATE `students.archived_at` trực tiếp bị chặn;
  - học sinh của lớp đã lưu trữ đọc `students`, `v_my_star_history`, `leaderboard_for_period` được 0 dòng hoặc bị lỗi;
  - học sinh gọi các hàm `save_*` thì `not_allowed`;
  - INSERT trực tiếp vào `attendance` với vai giáo viên trả 42501;
  - `set_timetable_saturday(false,false)` khi có 1 tiết thì `saturday_has_slots`; `(false,true)` trả 1 và còn 0 tiết;
  - `undo_mission_completion` cho nhiệm vụ 0 sao và nhiệm vụ có sao: dòng hoàn thành mất, ghi nhận lại được, sao về như cũ.
- [ ] **Step 2:** `pnpm supabase db reset && pnpm db:test` → FAIL.
- [ ] **Step 3:** Viết migration. Thêm câu tiếng Việt cho các khóa lỗi mới vào `lib/errors.ts`, kèm unit test:
  - `invalid_term_dates`: `'Ngày học kỳ chưa hợp lý. Cô kiểm tra lại thứ tự các ngày nhé.'`
  - `invalid_redeem_limit`: `'Số lượt đổi quà mỗi tuần phải từ 1 đến 20.'`
  - `invalid_star_steps`: `'Mức sao phải là số từ 1 đến 50, không trùng, tối đa 8 mức.'`
  - `saturday_has_slots`: `'Thời khóa biểu còn tiết thứ Bảy.'`
  - `use_set_saturday`: `'Không đổi được học thứ Bảy theo cách này.'`
  - `use_archive_student`: `'Cô lưu trữ học sinh bằng nút "Lưu trữ" nhé.'`
  - `completion_not_found`: `'Không tìm thấy lượt hoàn thành này.'`
  - `before_school_year`: `'Ngày này trước khi năm học bắt đầu.'`
- [ ] **Step 4:** Chạy `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && bash scripts/db/reward-race.sh`. Chạy cả `pnpm test:e2e tests/e2e/attendance.spec.ts tests/e2e/students.spec.ts tests/e2e/missions.spec.ts` (có thể vỡ vì đổi policy hoặc trigger lưu trữ). Mọi lệnh phải PASS.
- [ ] **Step 5:** Commit `feat(db): admin settings functions and hardening`.

### Task 2: Màu chủ đạo, công tắc dùng chung, tên trạm

**Files:**
- Modify: `lib/domain/theme.ts`, `app/globals.css`, `app/(teacher)/layout.tsx`, `app/em/layout.tsx`, `app/trinh-chieu/*`, `app/(auth)/dang-nhap/*`, và mọi file đang viết cứng `#4F5BD5` (grep: khoảng 32 chỗ trong 15 file).
- Create: `components/ui/Switch.tsx` (nếu đã có công tắc dùng chung thì sửa file đó), `lib/classes/brand.ts`.
- Test: `tests/unit/theme.test.ts`, `tests/unit/brand.test.ts`, `tests/e2e/theme.spec.ts`

**Interfaces (Produces):**
- `THEMES[k]` có thêm `strong` (màu nút và mục đang chọn; chữ trắng trên nền này phải có độ tương phản ≥ 4.5):
  - indigo `#4F5BD5`
  - pink `#C2407A`
  - mint `#12796B`
  - gold `#8F5A00`

  Nếu một màu chưa đạt 4.5 thì làm tối dần tới khi đạt. Ghi giá trị cuối vào report.
- Layout đặt `--primary` và `--primary-strong` theo `classes.theme`.
- Mọi `#4F5BD5` viết cứng đổi sang `primary-strong` (`bg-primary-strong`, `text-primary-strong`, `border-primary-strong`, hoặc `var(--primary-strong)` trong style). Màu nhạt đi kèm (`#EEF0FF`, `#2C37A8`) tính bằng `color-mix(in srgb, var(--primary-strong) …)`, hoặc thêm token `--primary-soft`/`--primary-ink` cho từng màu chủ đạo. Chọn một cách và ghi lại.
- `<Switch checked onChange label hint? disabled />`: kích thước 46×27, nút gạt bên phải, nhãn bên trái, như `Settings.dc.html`. Bật: nền `primary-strong`; tắt: `#B9B5E8`. Có `role="switch"` và `aria-checked`. Mọi công tắc cũ (Hồ sơ, Nhiệm vụ, Gọi tên) đổi sang component này.
- `brandTitle(cls: { class_name: string }): string`:
  - `'Năm 8 (5/8)'` → `'TRẠM KHÔNG GIAN NĂM 8'`;
  - `'Năm 9 (6/2)'` → `'TRẠM KHÔNG GIAN NĂM 9'`;
  - không khớp mẫu `Năm N` → `'TRẠM KHÔNG GIAN'`.

  Thay mọi chỗ viết cứng (`components/layout/StudentNav.tsx`, `components/layout/Sidebar.tsx`, `app/trinh-chieu/DisplayClient.tsx`, `app/layout.tsx` metadata, `app/(teacher)/tong-quan/page.tsx`) và các chữ dự phòng ở trang đăng nhập (`'Năm 8 (5/8)'`, `'Cô Khanh'`) bằng dữ liệu `classes`.
- Gói chỉnh giao diện từ đợt 1, mục nào chưa làm thì làm:
  - nút bo 14px;
  - padding Card 22/24px;
  - bỏ chữ "Đang cất cánh…";
  - ARIA cho tab Đăng nhập;
  - Playwright mobile dùng UA điện thoại.

- [ ] **Step 1:** Unit test:
  - mọi `THEMES[k].strong` có độ tương phản ≥ 4.5 với `#FFFFFF` (tự viết hàm độ sáng tương đối WCAG trong test);
  - `brandTitle` đúng 3 trường hợp trên.

  E2E: đặt `theme='mint'` bằng `sql` thì nút "Cộng sao" ở `/thi-dua` có `background-color` bằng `rgb(18, 121, 107)`; đặt lại `indigo` sau test.
- [ ] **Step 2:** FAIL. Rồi cài đặt. Kiểm còn `#4F5BD5` không: `grep -rn "#4F5BD5" app components` chỉ được còn trong `lib/domain/theme.ts`.
- [ ] **Step 3:** Chạy `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e`. Chạy cả bộ vì đụng nhiều trang; một tiến trình e2e mỗi lần. Phải PASS. So ảnh `test-results/*-desktop.png` với ảnh trước khi đổi: màu indigo không được khác.
- [ ] **Step 4:** Commit `feat(ui): theme token, shared switch, class brand`.

### Task 3: Trang Cài đặt — thông tin lớp, giao diện, quy định, tính năng, quyền xem

**Files:**
- Modify: `app/(teacher)/cai-dat/page.tsx`
- Create: `app/(teacher)/cai-dat/{SettingsClient.tsx,actions.ts}`, `lib/settings/queries.ts`
- Modify: `app/(teacher)/tong-quan/page.tsx` (ảnh bìa từ `classes.cover_path`), Sidebar và trang Đăng nhập (logo từ `logo_path` / `class_logo_path`; thiếu thì dùng ảnh có sẵn)
- Test: `tests/e2e/settings.spec.ts`

**Interfaces:**
- Consumes: `save_class_info`, `save_class_settings`, `set_timetable_saturday` (Task 1); `Switch`, `THEMES` (Task 2); quy trình tải ảnh có sẵn (`lib/domain/upload.ts`, `compress-image.ts`, thư mục `class-media/<lớp>/branding/`).
- Produces: `getSettingsData(classId)` trả `{ cls; settings; saturdaySlots: number }`.
- Bố cục và nhãn chép `Settings.dc.html`:
  - Mục "Thông tin lớp": thêm 4 ô ngày học kỳ, nhãn `'Học kỳ 1 bắt đầu'`, `'Học kỳ 1 kết thúc'`, `'Học kỳ 2 bắt đầu'`, `'Học kỳ 2 kết thúc'`, và dòng gợi ý `'Mỗi năm học cô cập nhật ngày học kỳ để bảng xếp hạng và nhiệm vụ theo học kỳ tính đúng.'`. Thêm công tắc `'Lớp học thứ Bảy'`. Ba thứ này không có trong thiết kế; ghi vào report.
  - Mục "Thông tin lớp" có nút "Lưu thông tin". Các công tắc lưu ngay khi bấm. Cả hai cách lưu đều báo `'Đã lưu cài đặt.'` ở vùng `msg`.
  - Mục quy định: dưới hai công tắc giữ trước sao và chỉ đổi khi đủ sao, thêm dòng `'Khi "Giữ trước sao" bật, học sinh luôn cần đủ sao để gửi yêu cầu. "Chỉ cho đổi khi đủ sao" chỉ có tác dụng khi "Giữ trước sao" tắt.'`.
  - Mức sao: "+ Thêm mức" mở ô nhập số, không tự cộng 1 như thiết kế.
  - Tắt thứ Bảy khi `saturdaySlots > 0` thì mở Modal `'Thời khóa biểu còn <n> tiết thứ Bảy. Cô muốn xóa các tiết này và tắt học thứ Bảy?'` với hai nút "Hủy" và "Xóa và tắt".
  - Tải logo trường, logo lớp, ảnh bìa: ghi `logo_path`, `class_logo_path`, `cover_path` qua `save_class_info`. Mở rộng hàm này nhận 3 key đường dẫn, mỗi đường dẫn phải bắt đầu bằng `<class_id>/branding/`.

- [ ] **Step 1:** E2E:
  - sửa "Slogan" rồi lưu, tải lại trang vẫn thấy giá trị mới;
  - chọn "Xanh mint" thì nút chính đổi màu;
  - tắt "Trạm đổi quà" thì học sinh `hs.hamy` mở `/em/doi-qua` bị 404;
  - tắt "Bảng xếp hạng" ở mục "Học sinh được xem" thì mục đó biến khỏi menu học sinh;
  - lượt đổi quà mỗi tuần = 0 thì hiện câu `invalid_redeem_limit`;
  - thêm mức 7 thì "+7" xuất hiện ở `/thi-dua`;
  - Review Focus 1: seed 1 tiết thứ Bảy, bật rồi tắt thứ Bảy → có hộp hỏi; "Hủy" thì công tắc vẫn bật; "Xóa và tắt" thì còn 0 tiết;
  - tải ảnh bìa thì `/tong-quan` hiện ảnh đó.

  Mọi cờ và giá trị đổi trong test phải đặt lại trong `afterAll`.
- [ ] **Step 2–4:** FAIL. Cài đặt. Chạy `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/settings.spec.ts tests/e2e/overview.spec.ts tests/e2e/student-portal.spec.ts`, phải PASS. Lưu ảnh `test-results/settings-{mobile,desktop}.png`.
- [ ] **Step 5:** Commit `feat: settings page`.

### Task 4: Tài khoản học sinh và đăng nhập

**Files:**
- Create: `lib/accounts/{password.ts,username.ts}`, `app/(teacher)/cai-dat/accounts-actions.ts`, `app/(teacher)/cai-dat/AccountsSection.tsx`
- Modify: `app/(teacher)/cai-dat/SettingsClient.tsx`, `app/(auth)/dang-nhap/*` (lỗi 429, tài khoản bị khóa), `lib/auth/session.ts` (lớp đã lưu trữ)
- Test: `tests/unit/accounts.test.ts`, `tests/e2e/accounts.spec.ts`

**Interfaces:**
- `generateTempPassword(rand?: (n: number) => number): string`: 10 ký tự lấy từ bộ chữ ở Global Constraints.
- `pickUsername(fullName: string, taken: Set<string>): string`: dùng `givenNameKey`, ví dụ `'Võ Hà My'` → `'hs.hamy'`; nếu `hs.hamy` đã có thì `'hs.hamy2'`.
- Server Action `createStudentAccounts(): Promise<{ created: { name; username; password }[]; failed: { name; reason }[] }>`:
  - chỉ giáo viên;
  - làm cho mọi học sinh chưa lưu trữ, chưa có `profiles`;
  - `admin.auth.admin.createUser({ email: usernameToEmail(u), password, email_confirm: true })`, rồi insert `profiles` bằng client admin;
  - insert lỗi thì xóa user Auth vừa tạo;
  - ghi `audit_logs` (`accounts_created`, chỉ ghi số lượng).
- `resetStudentPassword(studentId): Promise<{ name; username; password } | { error }>`.
- `setStudentLogin(studentId, enabled: boolean)`: `updateUserById(id, { ban_duration: enabled ? 'none' : '876000h' })` và cập nhật `profiles.login_disabled`.
- Giao diện theo `Settings.dc.html`:
  - Mỗi dòng có tên, tên đăng nhập và công tắc `'Được đăng nhập'`/`'Đã khóa'`.
  - Học sinh chưa có tài khoản hiện `'Chưa có tài khoản'` và không có công tắc.
  - Sau khi tạo hoặc đặt lại, mở Modal `'Mật khẩu tạm'`:
    - bảng Họ tên / Tên đăng nhập / Mật khẩu tạm;
    - dòng `'Mật khẩu tạm chỉ hiện một lần. Cô in hoặc ghi lại trước khi đóng.'`;
    - nút "In danh sách" (CSS print chỉ in bảng) và "Đóng";
    - bạn lỗi liệt kê dưới tiêu đề `'Chưa tạo được:'`.
  - Câu của thiết kế "Đã gửi mật khẩu tạm…" và "Mật khẩu thật không hiển thị cho cô." không dùng; theo spec §3.3, mật khẩu tạm hiện một lần.
- Đăng nhập:
  - GoTrue trả 429 thì báo `'Đăng nhập quá nhiều lần. Em chờ một lát rồi thử lại nhé.'`;
  - tài khoản bị khóa (lỗi `user_banned`) thì báo `'Tài khoản này đang bị khóa. Em hỏi cô giáo nhé.'`;
  - học sinh của lớp đã lưu trữ đi theo đường `/dang-xuat` có sẵn, kèm câu `'Năm học của em đã kết thúc.'`.

- [ ] **Step 1:** Unit test:
  - `generateTempPassword` có độ dài 10, chỉ dùng ký tự trong bộ chữ, `rand` cố định cho kết quả cố định;
  - `pickUsername` xử lý dấu, trùng và trùng nhiều lần.

  E2E (Supabase local):
  - tạo một học sinh mới `'Lý Thu Test'` rồi bấm "Tạo tài khoản hàng loạt" → Modal có `hs.thutest` và một mật khẩu 10 ký tự → đăng xuất, đăng nhập bằng tài khoản đó thì vào `/em`;
  - "Đặt lại mật khẩu" thì mật khẩu cũ hết dùng được, mật khẩu mới dùng được;
  - khóa tài khoản thì đăng nhập báo câu bị khóa; mở lại thì đăng nhập được;
  - Review Focus 2: chặn một bạn bằng cách tạo sẵn user Auth trùng email trước khi bấm → bạn đó nằm trong `'Chưa tạo được:'`, các bạn khác vẫn được tạo, và với email bị chặn không có dòng `profiles` nào dư.

  Dọn dẹp: xóa user Auth và `profiles` của test bằng `deleteTestStudents` (mở rộng helper này để xóa luôn user Auth).
- [ ] **Step 2–4:** FAIL. Cài đặt. Chạy `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/accounts.spec.ts tests/e2e/login.spec.ts`, phải PASS.
- [ ] **Step 5:** Commit `feat: student accounts`.

### Task 5: Thống kê – Báo cáo

**Files:**
- Create: `supabase/migrations/20261101000019_reports.sql`, `supabase/tests/19_reports.test.sql`, `lib/reports/{range.ts,export.ts,queries.ts}`, `app/(teacher)/bao-cao/{ReportsClient.tsx,actions.ts}`
- Modify: `app/(teacher)/bao-cao/page.tsx`
- Test: `tests/unit/report-range.test.ts`, `tests/unit/report-export.test.ts`, `tests/e2e/reports.spec.ts`

**Interfaces:**
- SQL `public.report_summary(p_from date, p_to date, p_bucket text) returns jsonb`:
  - chỉ giáo viên;
  - `p_bucket` là `day|week|month`;
  - khoảng ngày tính theo giờ Việt Nam và tính cả hai đầu;
  - lỗi `invalid_range` khi `from > to` hoặc khoảng dài hơn 400 ngày.

  Các key trả về:
  - `kpis`: `{ added, deducted, attendancePct, redeemed, improved }`.
    - `added`: tổng delta của `award` trừ phần đã bị `reversal` đảo.
    - `deducted`: số dương, tính như `added` nhưng cho `penalty`.
    - `attendancePct`: `attended / tổng bản ghi × 100`, làm tròn 0 chữ số; không có bản ghi thì 0.
    - `redeemed`: số yêu cầu `approved` + `delivered` có `decided_at` trong kỳ.
    - `improved`: số học sinh có sao thi đua kỳ này lớn hơn kỳ trước cùng độ dài.
  - `buckets`: `[{ label, added, deducted }]`, đủ mọi mốc kể cả mốc 0.
    - Nhãn ngày: `'Thứ 2'`…`'CN'`.
    - Nhãn tuần: `'Tuần 1'`… tính trong kỳ.
    - Nhãn tháng: `'T9'`.
  - `attendance`: `{ present, late, excused, unexcused }` theo phần trăm, tổng = 100 hoặc tất cả 0.
  - `lowAttendance`: top 3 học sinh có số buổi vắng (có phép + không phép) lớn nhất và > 0: `{ name, days }`.
  - `criteria`: mọi tiêu chí có số lần > 0, `{ label, kind, n }`, sắp theo `n` giảm dần.
  - `progress`: top 5 `{ studentId, name, avatarId, up }`, chỉ lấy `up > 0`.
  - `gifts`: `{ label, n }` theo tên quà, `n` giảm dần.
  - Học sinh đã lưu trữ không tính.
- `resolveReportRange(period: 'week'|'month'|'term'|'year'|'custom', now: Date, terms, custom?): { from; to; bucket; name }`:
  - tuần là thứ Hai – Chủ nhật;
  - học kỳ là kỳ chứa `now` theo ngày học kỳ (chưa đặt ngày thì báo lỗi `'Cô chưa đặt ngày học kỳ trong Cài đặt.'`);
  - năm từ `term1_start` tới `term2_end`;
  - custom thì `bucket`: ≤ 14 ngày → `day`, ≤ 92 ngày → `week`, còn lại `month`;
  - dùng lại `resolvePeriod`/`periodRange` có sẵn nếu khớp.
- `buildReportCsv(data, name): string` (BOM UTF-8, chặn công thức như `lib/attendance/csv.ts`) và `buildReportWorkbook(data, name)` (SheetJS, mỗi khối một sheet: `KPI`, `Theo thời gian`, `Chuyên cần`, `Tiêu chí`, `Tiến bộ`, `Đổi quà`).
- Tên file: `bao-cao-<slug tên kỳ>-<from>-<to>.csv|xlsx`.
- Giao diện chép `Reports.dc.html`:
  - 4 tab;
  - "Chọn ngày" mở Modal hai ô ngày "Từ ngày"/"Đến ngày" và nút "Xem báo cáo";
  - biểu đồ cột vẽ bằng div như thiết kế, không thêm thư viện;
  - tiêu đề `'Sao cộng và sao trừ theo <ngày|tuần|tháng>'`.

- [ ] **Step 1:** pgTAP: seed giao dịch, điểm danh, yêu cầu trong và ngoài kỳ; kiểm từng key, kể cả lần cộng đã bị hoàn tác và học sinh đã lưu trữ; học sinh gọi thì `not_allowed`; `invalid_range`.

  Unit: `resolveReportRange` cho cả 5 loại kỳ (biên tuần lúc nửa đêm giờ Việt Nam, học kỳ chưa đặt ngày, ngưỡng 14 và 92 ngày); CSV có BOM và chặn `=`.

  E2E:
  - seed sao thì KPI "Sao đã cộng" đúng `+n`;
  - "Xuất CSV" và "Xuất Excel" tải được file đúng tên (`page.waitForEvent('download')`);
  - Review Focus 5: khoảng ngày không có dữ liệu thì mọi KPI là 0, không có chữ `NaN`, và vẫn xuất được.
- [ ] **Step 2–4:** FAIL. Cài đặt. Chạy `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/reports.spec.ts`, phải PASS. Lưu ảnh `test-results/reports-desktop.png`.
- [ ] **Step 5:** Commit `feat: reports with csv and excel export`.

### Task 6: Sao lưu và khôi phục

**Files:**
- Create: `supabase/migrations/20261101000020_backup_year.sql` (phần sao lưu), `supabase/tests/20_backup_year.test.sql`, `lib/backup/{format.ts,validate.ts}`, `app/(teacher)/cai-dat/data-actions.ts`, `app/(teacher)/cai-dat/DataSection.tsx`, `app/(teacher)/cai-dat/sao-luu/route.ts`
- Test: `tests/unit/backup-validate.test.ts`, `tests/e2e/backup.spec.ts`

**Interfaces:**
- `public.export_class_backup(p_class_id uuid) returns jsonb`.
  - Quyền: giáo viên và (`p_class_id = my_class_id()` hoặc `classes.owner_id = auth.uid()`).
  - Dạng trả về: `{ format: 'tram-khong-gian-backup', version: 1, exported_at, class: {...}, tables: { <tên bảng>: [...] } }`.
  - Gồm mọi bảng có `class_id`. Không gồm `profiles`, `audit_logs` và dữ liệu Auth.
- Route `GET /cai-dat/sao-luu?lop=<id>`: chỉ giáo viên. Trả file `tram-sao-luu-<slug lớp>-<yyyy-mm-dd>.json` với `Content-Disposition: attachment`.
- `validateBackup(json: unknown): { ok: true; summary: { className; schoolYear; counts: Record<string, number> } } | { ok: false }`. Kiểm `format`, `version === 1` và kiểu của từng bảng.
- `public.restore_class_backup(p_backup jsonb) returns jsonb`: chỉ giáo viên. Làm theo thứ tự:
  1. Kiểm lại định dạng; sai thì báo `invalid_backup`.
  2. Tạo lớp mới (`owner_id = auth.uid()`). Tên lớp và năm học lấy từ bản sao lưu.
  3. Đổi mọi id sang id mới (bảng tạm ánh xạ cũ → mới) và chèn theo thứ tự khóa ngoại. `actor_id`/`decided_by`/`awarded_by` không còn trong `auth.users` thì đặt null.
  4. Đổi tiền tố đường dẫn ảnh `<lớp cũ>/` thành `<lớp mới>/`.
  5. Gọi `private.close_class(<lớp hiện tại>)`. Task này tạo helper đó và Task 7 dùng lại. Helper khóa học sinh của lớp (`FOR NO KEY UPDATE`), từ chối mọi yêu cầu `pending` qua `private.reject_request_locked` (trả sao đang giữ), đặt `archived_at`, rồi ghi nhật ký `class_archived`.
  6. Chuyển `profiles.class_id` của giáo viên sang lớp mới.
  7. Trả `{ classId, imagePaths: [{ from, to }] }`.

  Trigger chặn sửa sổ sao vẫn bật suốt quá trình (chỉ insert). Các dòng `reversal` chèn theo `created_at` để kiểm tra của trigger đúng.
- Server Action `restoreBackup(formData)`:
  - chỉ giáo viên;
  - file tối đa 20 MB;
  - chạy `validateBackup`, gọi RPC;
  - chép từng ảnh trong Storage bằng client admin; ảnh nguồn không còn thì đặt đường dẫn đó thành null bằng `save_class_info` hoặc update có RLS;
  - `redirect('/tong-quan')`.
- Giao diện mục "Năm học và dữ liệu": các nút và gợi ý chép từ thiết kế.
  - "Sao lưu dữ liệu" tải file.
  - "Khôi phục từ bản sao lưu" làm ba bước:
    1. chọn file;
    2. Modal xem trước: tên lớp, năm học, số học sinh, số giao dịch sao, và câu `'Khôi phục sẽ tạo một năm học mới từ bản sao lưu và lưu trữ năm học hiện tại. Dữ liệu hiện tại không bị xóa. Học sinh cần được tạo lại tài khoản.'`;
    3. nút "Khôi phục".
  - Thêm danh sách `'Các năm học đã lưu trữ'`, mỗi dòng có nút "Tải sao lưu".

- [ ] **Step 1:** pgTAP: sao lưu rồi khôi phục trong một giao dịch rollback. Lớp mới phải có:
  - cùng số dòng mỗi bảng;
  - cùng `competition_stars`/`available_stars` cho từng học sinh (so theo `code`);
  - lớp cũ có `archived_at`;
  - giáo viên đã chuyển sang lớp mới.

  Thêm: `invalid_backup` với `{}`, `version: 2` và JSON thiếu bảng; học sinh gọi thì `not_allowed`; giáo viên không sở hữu `p_class_id` thì `not_allowed`.

  Unit: `validateBackup` với các trường hợp hỏng.

  E2E: "Sao lưu dữ liệu" tải được file JSON có `format`. Review Focus 3: tải lên file `{"a":1}` thì báo `'File sao lưu không hợp lệ.'`, và lớp vẫn như cũ.

  E2E không chạy khôi phục thật vì làm đổi lớp của giáo viên; đường này được pgTAP phủ.
- [ ] **Step 2–4:** FAIL. Cài đặt. Chạy `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/backup.spec.ts`, phải PASS.
- [ ] **Step 5:** Commit `feat: class backup and restore`.

### Task 7: Năm học mới và xóa dữ liệu demo

**Files:**
- Modify: `supabase/migrations/20261101000020_backup_year.sql` (thêm phần năm học), `supabase/tests/20_backup_year.test.sql`, `app/(teacher)/cai-dat/{DataSection.tsx,data-actions.ts}`
- Test: `tests/e2e/new-year.spec.ts`

**Interfaces:**
- `public.start_new_school_year(p jsonb) returns uuid`: chỉ giáo viên.
  - Key:
    - `school_year`, `class_name` (bắt buộc), `school_name`, `teacher_name`, `slogan` (lấy từ lớp cũ khi không gửi), `theme`;
    - `copy`: mảng con của `subjects`, `timetable`, `criteria`, `rewards`, `avatars`, `settings`, `missions`. `timetable` cần có `subjects`, nếu không thì báo `invalid_input`.
  - Làm theo thứ tự:
    1. Tạo lớp mới (`owner_id = auth.uid()`, `class_settings` do trigger tạo; nếu `copy` có `settings` thì chép cờ). Chép danh mục đã chọn với id mới. `rewards` chép với `stock` như cũ.
    2. Gọi `private.close_class(<lớp cũ>)` (Task 6). Helper này từ chối các yêu cầu đang chờ, trả sao đang giữ, rồi đặt `archived_at`.
    3. Chuyển giáo viên sang lớp mới.
    4. Ghi nhật ký.
  - Sao học sinh không chép, nên năm mới bắt đầu từ 0.
- `public.delete_demo_data() returns jsonb`: chỉ giáo viên, lớp hiện tại.
  - Xóa mọi dòng thuộc học sinh `is_demo`, mọi dòng `is_demo` khác, và `profiles` của học sinh demo.
  - Bỏ qua dòng danh mục demo (quà, môn, tiêu chí, huy hiệu, nhiệm vụ) mà dữ liệu thật còn tham chiếu.
  - Thứ tự xóa:
    1. `mission_completions`, `student_badges`, `star_transactions`, `reward_requests`, `attendance`, `group_members`;
    2. `profiles` của học sinh demo, rồi `students`;
    3. `timetable_slots` trước `subjects`, `missions`, `badges`, `rewards`, `star_criteria`, `announcements`, `groups`, `avatar_library` không còn được dùng.
  - Sổ sao được xóa nhờ `set_config('app.demo_purge','on',true)`: trigger `ledger_immutable` cho xóa khi cờ này bật và dòng thuộc học sinh demo.
  - Trả `{ deletedStudents, keptCatalog, authUserIds: uuid[] }`.
- Server Action `deleteDemoData()`: gọi RPC, rồi `admin.auth.admin.deleteUser` cho từng `authUserIds`.
- Giao diện:
  - Nút "Lưu trữ năm học <school_year>" mở form Modal `'Mở năm học mới'`:
    - các ô năm học (gợi ý năm kế tiếp, ví dụ `'2027 – 2028'`), tên lớp, giáo viên;
    - ô chọn "Chép sang năm mới": Môn học, Thời khóa biểu, Tiêu chí sao, Phần thưởng, Thư viện avatar, Cài đặt, Nhiệm vụ & huy hiệu. Mặc định chọn hết trừ Thời khóa biểu;
    - nút "Lưu trữ và mở năm mới".
    - Thành công thì về `/tong-quan` và báo `'Đã mở năm học <năm>.'`.
  - "Xóa dữ liệu demo" mở Modal `'Xóa toàn bộ dữ liệu mẫu (10 học sinh mẫu và dữ liệu đi kèm)? Không hoàn tác được.'`, hai nút "Hủy" và "Xóa dữ liệu demo". Thành công thì báo `'Đã xóa dữ liệu demo.'`. Nếu `keptCatalog > 0` thì báo thêm `'Giữ lại <n> mục vì dữ liệu thật còn dùng.'`.
  - Không có dữ liệu demo thì nút bị khóa và có gợi ý `'Không còn dữ liệu demo.'`.

- [ ] **Step 1:** pgTAP, trong giao dịch rollback:
  - `start_new_school_year` với `copy` đầy đủ: số dòng danh mục ở lớp mới bằng lớp cũ; lớp mới có 0 học sinh; lớp cũ có `archived_at`;
  - Review Focus 4: trước đó tạo 1 yêu cầu `pending` có giữ sao → sau khi mở năm mới, yêu cầu là `rejected`, sao khả dụng của học sinh về như trước khi gửi, học sinh năm cũ gọi `my_profile_summary` không còn dữ liệu;
  - `timetable` thiếu `subjects` thì `invalid_input`;
  - `delete_demo_data`: còn 0 học sinh demo; dữ liệu thật giữ nguyên (seed thêm 1 học sinh không demo có sao trước khi xóa); quà demo mà học sinh thật có yêu cầu thì được giữ lại;
  - học sinh gọi hai hàm thì `not_allowed`.

  E2E (không chạy thật vì phá dữ liệu dùng chung):
  - mở form năm mới thì năm gợi ý đúng, "Hủy" không đổi gì;
  - "Xóa dữ liệu demo" thì có hộp hỏi, "Hủy" thì vẫn còn 10 học sinh.
- [ ] **Step 2–4:** FAIL. Cài đặt. Chạy `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/new-year.spec.ts tests/e2e/backup.spec.ts`, phải PASS. Lưu ảnh `test-results/settings-data-desktop.png`.
- [ ] **Step 5:** Commit `feat: new school year and demo data cleanup`.

### Task 8: Gói việc chuyển tiếp nhỏ

Mỗi mục một dòng sửa và có test khi mục đó có logic. Ghi trong report mục nào đã có sẵn.

**Files:** theo từng mục.

- Thông báo:
  - các Server Action thêm `.eq('class_id', …)`;
  - `togglePin` gửi trạng thái đích;
  - giới hạn ảnh phía client 2 MB;
  - câu `file_too_large` nói 2 MB.
- Điểm danh:
  - link guard so `?ngay` thay vì cả chuỗi truy vấn;
  - bấm kèm Ctrl/Cmd thì không hỏi;
  - `getDay` sắp theo `student_id`;
  - khi danh sách lớp đổi giữa chừng thì báo `'Danh sách lớp vừa thay đổi, cô tải lại trang nhé.'`.
- Thời khóa biểu:
  - in ở chế độ "Theo ngày" chỉ in ngày đang xem;
  - tên môn chuẩn hóa NFC trước khi lưu;
  - `usedCount` không đếm tiết thứ Bảy khi thứ Bảy tắt;
  - test in ở bề rộng 1050px.
- Đổi quà (giáo viên):
  - `/doi-qua` hiện `'Tính năng này đang tắt. Cô bật lại trong Cài đặt.'` khi `feature_rewards` tắt. Trang vẫn dùng được, giống `/nhiem-vu`.
- Trạm thi đua:
  - hoàn tác bị chặn vì sao đang giữ cho yêu cầu đổi quà thì báo `'Không hoàn tác được: một phần sao đang được giữ cho yêu cầu đổi quà.'`.
- Nhiệm vụ:
  - nút "Hoàn tác" cho từng lượt hoàn thành ở `/nhiem-vu`, gọi `undo_mission_completion` (Task 1).
- Học sinh:
  - câu lỗi `invalid_input` cho học sinh dùng `'Có lỗi nhỏ, em tải lại trang rồi thử lại nhé.'` (thêm tham số người xem cho `toVietnameseMessage`, hoặc thêm khóa riêng);
  - thông báo xem thử dùng tone trung tính.
- Gộp helper:
  - `WEEKDAYS` dùng một bản ở `lib/domain/date.ts`;
  - `LbRow` dùng một kiểu chung;
  - màu trạng thái điểm danh ghi chú chéo giữa trang học sinh và giáo viên.
- `app/error.tsx` dùng câu trung tính `'Cô hoặc em thử lại, hoặc quay về trang chủ nhé.'`.
- `signAvatarPaths` ghi `console.error` khi ký URL lỗi (vẫn trả ảnh mặc định).
- Gỡ ảnh mồ côi: Server Action tải ảnh (quà, thông báo, branding) xóa file vừa tải khi bước ghi DB sau đó lỗi.

- [ ] **Step 1–3:** Viết test cho các mục có logic. Cài đặt. Chạy `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e tests/e2e/announcements.spec.ts tests/e2e/attendance.spec.ts tests/e2e/timetable.spec.ts tests/e2e/rewards.spec.ts tests/e2e/stars.spec.ts tests/e2e/missions.spec.ts`, phải PASS. Tên file spec nào khác thì grep `tests/e2e`.
- [ ] **Step 4:** Commit `chore: phase 1-5 follow-ups`.

### Task 9: Chuẩn bị chạy thật

**Files:**
- Create: `scripts/bootstrap-class.ts`, `docs/DEPLOY-NOTES.md`, `.env.production.example`
- Modify: `package.json` (script `bootstrap:prod`), `.gitignore` (thêm `.mcp.json`, `.env.production.local`), `scripts/create-teacher.ts` (nếu gộp)
- Test: `tests/unit/bootstrap.test.ts` (phần thuần: kiểm biến môi trường, dựng payload)

**Interfaces:**
- `pnpm bootstrap:prod` (`tsx --env-file=.env.production.local scripts/bootstrap-class.ts`):
  - đọc `SCHOOL_NAME`, `CLASS_NAME`, `SCHOOL_YEAR`, `TEACHER_NAME`, `TEACHER_USERNAME`, `TEACHER_PASSWORD` (chỉ từ biến môi trường, không bao giờ in ra);
  - tạo `classes` (`class_settings` do trigger tạo), 12 avatar preset như seed;
  - tạo tài khoản giáo viên và đặt `owner_id`;
  - chạy lại lần nữa thì không tạo trùng: thấy lớp có cùng `class_name` + `school_year` thì dừng và báo.
- Thiếu biến môi trường thì dừng, nêu tên biến thiếu.
- `docs/DEPLOY-NOTES.md`: tiếng Việt, từng bước, cho người dùng tự làm:
  1. Kiểm Postgres ≥ 15 trên project Supabase.
  2. `supabase link` rồi `supabase db push`. Đây là bước người dùng tự chạy; ghi rõ là đợt 6 chưa chạy.
  3. Auth:
     - bật Email provider;
     - tắt "Allow new users to sign up";
     - tắt "Confirm email";
     - tăng rate limit đăng nhập (40 học sinh cùng IP lớp học), ghi tên mục trong dashboard;
     - Site URL và Redirect URL theo tên miền Vercel.
  4. Storage: bucket `class-media` được migration tạo; kiểm lại.
  5. `.env.production.local` theo `.env.production.example`, rồi `pnpm bootstrap:prod`.
  6. Vercel: tạo project từ repo; đặt 4 biến (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_EMAIL_DOMAIN`). `AUTH_EMAIL_DOMAIN` phải giống hệt giá trị lúc chạy bootstrap.
  7. Duyệt bản preview; gắn tên miền riêng (Settings → Domains).
  8. Sau khi chạy thật: Cài đặt → "Xóa dữ liệu demo" không cần (production không seed demo); "Tạo tài khoản hàng loạt"; in mật khẩu tạm.
  9. Ghi chú:
     - advisor Supabase cảnh báo `security_definer_view` cho các view `v_*` là cố ý;
     - mỗi năm học cập nhật ngày học kỳ;
     - sao lưu định kỳ.
  10. Bảng kiểm tra sau triển khai: đăng nhập cô, tạo 1 học sinh, tạo tài khoản, học sinh đăng nhập, cộng sao, đổi quà, duyệt.

- [ ] **Step 1:** Unit test cho hàm kiểm biến môi trường (liệt kê đúng biến thiếu) và dựng payload lớp.
- [ ] **Step 2:** Chạy thử `bootstrap-class.ts` với Supabase local (`.env.local`, lớp tên `'Thử bootstrap'`, rồi xóa lại bằng `sql`). Chạy lần hai thì báo trùng.
- [ ] **Step 3:** Chạy `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build`, phải PASS.
- [ ] **Step 4:** Commit `chore: production bootstrap and deploy notes`.

### Task 10: Kiểm tra cuối đợt

- [ ] **Step 1:** Chạy `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm build && pnpm test:e2e && bash scripts/db/reward-race.sh`, phải PASS.
- [ ] **Step 2:** So ảnh chụp với thiết kế (Settings, Reports). Ghi `docs/superpowers/plans/2026-11-01-dot-6-ghi-chu.md`.
- [ ] **Step 3:** Commit `chore: phase 6 verification notes`.
