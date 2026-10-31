# Đợt 1: Nền tảng – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khung Next.js + Supabase hoàn chỉnh: toàn bộ schema, RLS, đăng nhập bằng tên đăng nhập, layout giáo viên/học sinh (Sidebar, Header, Avatar), trang Đăng nhập và trang Hồ sơ và avatar chạy với dữ liệu thật trên Supabase local.

**Architecture:** Next.js 15 App Router, đọc dữ liệu ở Server Component qua `@supabase/ssr`, ghi qua Server Action. Mọi quyền kiểm tra bằng RLS và hàm `security definer` trong Postgres. Thao tác quản trị tài khoản dùng service role, chỉ ở server.

**Tech Stack:** Node 20, pnpm 10, Next.js 15, React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`, Supabase CLI (devDependency `supabase`), pgTAP (`supabase test db`), Vitest + Testing Library + jsdom, Playwright, zod.

**Spec:** `docs/superpowers/specs/2026-10-31-tram-khong-gian-nam-8-design.md` (đọc mục 3, 4, 6, 7). Bản vẽ: `design/project/*.dc.html`, `design/HANDOFF.md`.

## Global Constraints

- Màu: `primary #6675E8`, `primary-strong #4F5BD5`, `lavender #B9A7F8`, `pink #F46FA5`, `star #FFC857`, `mint #80DDD0`, `bg #F6F4FF`, `ink #231F4D`, `muted #5B5890`, navy gradient `#25286A → #33378F`. Thẻ bo 22–28px.
- Phông: Baloo 2 (600/700/800) cho tiêu đề, số; Nunito (400/600/700/800) cho nội dung; `next/font/google`, subsets `['latin','vietnamese']`.
- Nút và mục bấm cao tối thiểu 44px. Icon là SVG nét lấy path từ thiết kế. Không emoji.
- Mọi chữ hiển thị là tiếng Việt có dấu, chép đúng từ `.dc.html`.
- URL tiếng Việt không dấu theo mục 3.1 spec.
- Múi giờ hiển thị và tính ngày: `Asia/Ho_Chi_Minh`.
- Email ẩn: `<username>@${AUTH_EMAIL_DOMAIN}`, mặc định `tram58.local`. Username chỉ gồm `[a-z0-9._]`, dài 3–32.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng trong file có `import 'server-only'`.
- Mọi hàm Postgres: `security definer`, `set search_path = ''`, tham chiếu bảng bằng tên đầy đủ `public.x`.
- Hàm trợ giúp RLS đặt trong schema `private` (không lộ qua API).
- Ảnh tải lên: tối đa 5 MB, chỉ `image/jpeg`, `image/png`, `image/webp`.
- Commit sau mỗi task; message dạng `feat:`, `test:`, `chore:`. Không thêm dòng attribution.

## Review Focus

1. Tên đăng nhập gõ có hoa, khoảng trắng hoặc dấu (`" Co.Khanh "`, `"hs.minhánh"`) → chuẩn hóa về chữ thường, bỏ khoảng trắng hai đầu; có dấu hoặc ký tự lạ thì báo "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới." chứ không gửi lên Auth. Test ở Task 5.
2. Tài khoản Auth hợp lệ nhưng không có dòng `profiles`, hoặc học sinh đã lưu trữ → không vào được trang nào, đăng xuất và báo "Tài khoản này chưa được gắn với lớp. Em hãy báo cô giáo nhé." Test ở Task 6.
3. Server Vercel chạy UTC: lúc 23:30 UTC ngày 31/10, ở Việt Nam đã là 06:30 ngày 01/11 → Header phải hiện "Chủ Nhật, 01/11/2026", không phải ngày UTC. Test ở Task 5.
4. Phiên đăng nhập hết hạn khi đang ở trang → request tiếp theo về `/dang-nhap?next=<đường dẫn cũ>`, không lỗi 500; sau khi đăng nhập quay về đúng trang. Test ở Task 5 và Task 6.
5. Tải avatar quá 5 MB hoặc sai định dạng → báo lỗi tiếng Việt, không tạo dòng `avatar_library`. Học sinh gọi `set_my_avatar` khi cô tắt quyền → lỗi `avatar_not_allowed`. Test ở Task 4 và Task 9.

## Điều kiện trước khi chạy

- Docker Desktop đang chạy (cần cho `pnpm supabase start`). Máy hiện có Docker nhưng chưa bật: người dùng tự mở Docker Desktop.
- Không cài Supabase CLI toàn cục; dùng `pnpm supabase ...` từ devDependency.

## Sơ đồ file

```
package.json, pnpm-lock.yaml, next.config.ts, tsconfig.json, postcss.config.mjs
vitest.config.ts, vitest.setup.ts, playwright.config.ts, .env.example
app/layout.tsx, app/globals.css, app/not-found.tsx, app/error.tsx
app/(auth)/dang-nhap/page.tsx, app/(auth)/dang-nhap/LoginForm.tsx, app/(auth)/actions.ts
app/(teacher)/layout.tsx, app/(teacher)/<14 route>/page.tsx (stub trừ ho-so)
app/(teacher)/ho-so/page.tsx, ProfileClient.tsx, actions.ts
app/em/layout.tsx, app/em/page.tsx (stub)
app/trinh-chieu/page.tsx (stub)
components/ui/{Button,Card,Toggle,Modal,Notice}.tsx
components/avatar/{Avatar,AvatarImage}.tsx, components/avatar/presets.ts
components/layout/{Sidebar,Header,ComingSoon}.tsx, components/layout/nav.ts
lib/supabase/{client,server,admin,middleware}.ts
lib/auth/{username,session,route-guard}.ts
lib/domain/{date,types,theme}.ts
lib/errors.ts
middleware.ts
public/brand/*.jpg|png (chép từ design/assets)
supabase/config.toml, supabase/seed.sql
supabase/migrations/20261101000001_schema.sql
supabase/migrations/20261101000002_helpers_rls.sql
supabase/migrations/20261101000003_views.sql
supabase/migrations/20261101000004_storage_avatar.sql
supabase/tests/{01_schema,02_rls,03_views,04_avatar}.test.sql
scripts/seed-dev-users.ts, scripts/create-teacher.ts
tests/unit/*.test.ts(x), tests/e2e/*.spec.ts
```

---

### Task 1: Khởi tạo dự án, token giao diện, công cụ test

**Files:**
- Create: toàn bộ file gốc ở sơ đồ trên (`package.json` … `.env.example`), `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `public/brand/*`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: script `pnpm dev|build|lint|test|test:e2e|db:test`; class Tailwind `bg-bg text-ink bg-primary bg-primary-strong text-muted font-display font-body rounded-card`; CSS var `--primary` (mặc định `#6675E8`); file ảnh `/brand/logo-truong.jpg`, `/brand/logo-lop.jpg`, `/brand/ba-ban-nho.png`.

- [ ] **Step 1:** Ở gốc repo `/Users/phtran/Desktop/MaiKhanh-WebQuảnLy`, chạy `pnpm create next-app@15 . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm` (giữ nguyên `design/`, `docs/`, `.gitignore` đã có; gộp `.gitignore` nếu bị ghi đè).
- [ ] **Step 2:** Cài thêm: `pnpm add @supabase/ssr @supabase/supabase-js zod server-only` và `pnpm add -D supabase vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test tsx`. Chạy `pnpm exec playwright install chromium`.
- [ ] **Step 3:** Viết `vitest.config.ts` (environment `jsdom`, alias `@`, include `tests/unit/**/*.test.{ts,tsx}`, setup `vitest.setup.ts` import `@testing-library/jest-dom/vitest`) và `playwright.config.ts` (testDir `tests/e2e`, `baseURL http://localhost:3000`, `webServer: pnpm dev`, ba project `mobile` 375×812, `tablet` 768×1024, `desktop` 1280×800). Script trong `package.json`: `"test": "vitest run"`, `"test:e2e": "playwright test"`, `"db:test": "supabase test db"`.
- [ ] **Step 4:** Viết test smoke `tests/unit/smoke.test.ts`: `expect(1 + 1).toBe(2)`; chạy `pnpm test` → PASS.
- [ ] **Step 5:** `app/globals.css`: `@import "tailwindcss";` và `@theme` khai báo các màu ở Global Constraints (`--color-primary: var(--primary)`, `--color-primary-strong`, `--color-lavender`, `--color-pink`, `--color-star`, `--color-mint`, `--color-bg`, `--color-ink`, `--color-muted`, `--color-navy-from #25286A`, `--color-navy-to #33378F`), `--radius-card: 24px`, `--font-display: var(--font-baloo)`, `--font-body: var(--font-nunito)`. `:root { --primary: #6675E8 }`. `body` nền `bg`, chữ `ink`, phông `body`. Thêm keyframes `tw` (nhấp nháy sao) và `fl` (bay lơ lửng) chép từ `Login.dc.html`.
- [ ] **Step 6:** `app/layout.tsx`: `lang="vi"`, nạp `Baloo_2` (biến `--font-baloo`) và `Nunito` (biến `--font-nunito`) với subsets `['latin','vietnamese']`; metadata title `Trạm không gian Năm 8`. `app/page.tsx` tạm `redirect('/dang-nhap')`.
- [ ] **Step 7:** Chép ảnh: `design/assets/logo-truong-chinh-nghia.jpg → public/brand/logo-truong.jpg`, `logo-lop-5-8-team-co-khanh.jpg → public/brand/logo-lop.jpg`, `anh-3-ban-nho-trong-suot.png → public/brand/ba-ban-nho.png`.
- [ ] **Step 8:** `.env.example` liệt kê `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`, `AUTH_EMAIL_DOMAIN=tram58.local`.
- [ ] **Step 9:** Chạy `pnpm build` và `pnpm lint` → cả hai thành công.
- [ ] **Step 10:** Commit `chore: scaffold Next.js app with design tokens and test tooling`.

---

### Task 2: Supabase local và schema

**Files:**
- Create: `supabase/config.toml` (qua `pnpm supabase init`), `supabase/migrations/20261101000001_schema.sql`
- Test: `supabase/tests/01_schema.test.sql`

**Interfaces:**
- Produces: các bảng ở mục 4 spec với đúng tên cột; thêm cột `profiles.avatar_id uuid null references avatar_library` và `profiles.display_name text not null` (avatar và tên của giáo viên, bổ sung so với spec). Kiểu enum:
  - `user_role ('teacher','student')`
  - `group_role ('leader','deputy','member')`
  - `criterion_kind ('award','penalty')`
  - `star_kind ('award','penalty','reserve','release','redeem','reversal')`
  - `reward_request_status ('pending','approved','rejected','delivered')`
  - `attendance_status ('present','absent_unexcused','absent_excused','late')`
  - `day_session ('morning','afternoon')`
  - `mission_period ('week','month')`
  - `avatar_kind ('preset','upload')`

- [ ] **Step 1:** `pnpm supabase init`; trong `config.toml` đặt `[auth] enable_signup = false`, `[auth.email] enable_confirmations = false`. Chạy `pnpm supabase start` → in ra API URL, anon key, service_role key; ghi vào `.env.local` (không commit).
- [ ] **Step 2: Viết test thất bại** `01_schema.test.sql` (pgTAP, `begin; select plan(n); … select * from finish(); rollback;`):
  - `has_table` cho 20 bảng: `classes, profiles, students, groups, group_members, star_criteria, star_transactions, rewards, reward_requests, attendance, subjects, timetable_slots, announcements, missions, mission_completions, badges, student_badges, avatar_library, class_settings, audit_logs`.
  - `col_is_unique('public','profiles','username')`; unique `attendance(student_id,date)`; unique `star_transactions(reverses_id)`; unique `timetable_slots(class_id,weekday,session,period)`; unique `group_members(class_id,student_id)`; unique `student_badges(badge_id,student_id)`.
  - `throws_ok` khi insert `star_transactions` có `delta = 0` (check `delta <> 0`).
  - `throws_ok` khi insert `timetable_slots` có `weekday = 7` (check `weekday between 1 and 6`) và `session='afternoon', period=4` (check: morning 1–5, afternoon 1–3).
  - `throws_ok` khi insert `rewards` có `stock = -1` hoặc `cost = 0` (check `stock >= 0`, `cost > 0`).
  - `has_index` trên `star_transactions(student_id, created_at)` và `attendance(student_id, date)`.
- [ ] **Step 3:** Chạy `pnpm db:test` → FAIL (bảng chưa có).
- [ ] **Step 4:** Viết migration `20261101000001_schema.sql` theo mục 4 spec: enum ở trên; mọi bảng (trừ `classes`, `profiles`, `audit_logs`) có `class_id uuid not null references public.classes on delete restrict`, `created_at timestamptz not null default now()`, `is_demo boolean not null default false`; `profiles.id references auth.users on delete cascade`, `profiles.student_id references public.students` unique; `class_settings.class_id` là khóa chính; chỉ mục cho mọi khóa ngoại. Cột mặc định của `class_settings` theo mục 4.3 spec (`student_can_view_attendance default false`, các cờ khác `default true`, `weekly_redeem_limit default 2`, `star_steps int[] default '{1,2,3,5,10}'`). `classes.theme text not null default 'indigo' check (theme in ('indigo','pink','mint','gold'))`.
- [ ] **Step 5:** `pnpm supabase db reset` rồi `pnpm db:test` → PASS.
- [ ] **Step 6:** Commit `feat(db): add core schema`.

---

### Task 3: Hàm trợ giúp, RLS và view sao

**Files:**
- Create: `supabase/migrations/20261101000002_helpers_rls.sql`, `supabase/migrations/20261101000003_views.sql`
- Test: `supabase/tests/02_rls.test.sql`, `supabase/tests/03_views.test.sql`

**Interfaces:**
- Consumes: bảng Task 2.
- Produces:
  - `private.my_class_id() returns uuid`, `private.is_teacher() returns boolean`, `private.my_student_id() returns uuid`, `private.setting_on(flag text) returns boolean` (đọc cờ của lớp mình). Tất cả `stable security definer set search_path=''`.
  - View `public.v_student_stars(class_id, student_id, competition_stars int, available_stars int)`.
  - View `public.v_leaderboard_public(class_id, student_id, full_name, avatar_id, competition_stars)`.
  - View `public.v_my_star_history(id, student_id, delta, kind, label, created_at)`; `label` là tên tiêu chí/ghi chú với `award` và `reversal` của award, và chuỗi cố định `'Trừ sao'` với `penalty` và `reversal` của penalty.
  - Các view tạo `with (security_invoker = true)`, trừ `v_leaderboard_public` (dùng `security_barrier`, owner postgres, tự lọc `class_id = private.my_class_id()` và học sinh chưa lưu trữ) để học sinh thấy bạn khác chỉ ở các cột đã chọn.

- [ ] **Step 1: Viết test RLS thất bại** `02_rls.test.sql`. Dữ liệu trong test: 1 lớp, giáo viên T, học sinh A và B (insert thẳng `auth.users` + `profiles` + `students`), mỗi học sinh 1 giao dịch `award` và A có 1 `penalty` ghi chú `'Nói chuyện riêng'`. Hàm tiện ích trong file: `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', <uuid>, 'role','authenticated')::text, true);`. Assertions:
  - Với vai A: `select count(*) from public.star_transactions` = 2 (chỉ của A); `from public.students` = 1; `from public.profiles` = 1.
  - Với vai A: `throws_ok` hoặc `is(0 rows affected)` cho `insert into public.star_transactions …`, `update public.students set full_name='x'`, `update public.class_settings set …`.
  - Với vai A, khi `student_can_view_attendance = false`: `select count(*) from public.attendance` = 0 dù có dòng của A; bật cờ lên → 1.
  - Với vai T: đọc được cả 3 giao dịch; `delete from public.star_transactions` xóa 0 dòng.
  - Với vai `anon`: mọi bảng trả 0 dòng.
- [ ] **Step 2: Viết test view thất bại** `03_views.test.sql`:
  - A có `award +5`, `penalty −2`, `reserve −3`; B có `award +4`. `v_student_stars` của A: `competition_stars = 3`, `available_stars = 0`.
  - Thêm `reversal +2` với `reverses_id` = penalty của A → `competition_stars = 5`, `available_stars = 2`.
  - Với vai A: `v_leaderboard_public` trả 2 dòng (A, B) và không có cột nào chứa ghi chú; `v_my_star_history` chỉ trả dòng của A và dòng penalty có `label = 'Trừ sao'`.
- [ ] **Step 3:** `pnpm db:test` → FAIL.
- [ ] **Step 4:** Viết `20261101000002_helpers_rls.sql`: tạo schema `private`, `revoke all on schema private from public, anon, authenticated; grant usage on schema private to authenticated;`, bốn hàm trợ giúp; `enable row level security` mọi bảng; policy:
  - Teacher (`private.is_teacher() and class_id = private.my_class_id()`): `select, insert, update` trên mọi bảng có `class_id`; `classes` theo `id`. Không có policy `delete` cho `star_transactions`, `reward_requests`, `students`, `audit_logs`. Có `delete` cho `group_members`, `timetable_slots`, `subjects`.
  - Student: chỉ `select`, đúng danh sách ở mục 4.4 spec, kèm `private.setting_on('<cờ>')` tương ứng (`student_can_view_history` cho `star_transactions`, `student_can_view_rewards` cho `rewards` và `reward_requests`, `student_can_view_timetable` cho `subjects`, `timetable_slots`, `student_can_view_news` cho `announcements`, `student_can_view_attendance` cho `attendance`).
  - `profiles`: mỗi người đọc dòng của mình; teacher đọc mọi dòng cùng lớp.
  - `revoke update, insert, delete` trên mọi bảng khỏi `anon`.
- [ ] **Step 5:** Viết `20261101000003_views.sql` theo Interfaces; `grant select` view cho `authenticated`.
- [ ] **Step 6:** `pnpm supabase db reset && pnpm db:test` → PASS cả 01–03.
- [ ] **Step 7:** Commit `feat(db): add RLS policies and star views`.

---

### Task 4: Storage, hàm avatar, seed và script tài khoản

**Files:**
- Create: `supabase/migrations/20261101000004_storage_avatar.sql`, `supabase/seed.sql`, `scripts/seed-dev-users.ts`, `scripts/create-teacher.ts`
- Test: `supabase/tests/04_avatar.test.sql`

**Interfaces:**
- Consumes: hàm `private.*` của Task 3.
- Produces:
  - Bucket `class-media` (private, `file_size_limit 5242880`, `allowed_mime_types {image/jpeg,image/png,image/webp}`); đường dẫn đối tượng `<class_id>/<folder>/<uuid>.<ext>`, folder ∈ `logo|cover|rewards|avatars|announcements`.
  - `public.set_my_avatar(p_avatar_id uuid) returns void`: học sinh tự đổi; lỗi `raise exception 'avatar_not_allowed'` khi cờ `student_can_change_avatar` tắt; `'avatar_not_found'` khi avatar không thuộc lớp hoặc đang ẩn.
  - `public.set_avatar_for(p_profile_id uuid, p_avatar_id uuid) returns void`: chỉ teacher; cập nhật `students.avatar_id` (nếu profile là học sinh) hoặc `profiles.avatar_id` (giáo viên); lỗi `'not_allowed'`.
  - Hằng lớp seed: `class_id = '00000000-0000-0000-0000-000000000058'`.
  - `pnpm seed:dev` tạo tài khoản local `co.khanh` (teacher, tên "Cô Khanh"), `hs.minhanh` (Nguyễn Minh Anh), `hs.hamy` (Võ Hà My), mật khẩu dev đọc từ `scripts/dev-users.json` (file commit, chỉ dùng cho local, ghi rõ trong file là mật khẩu thử).
  - `pnpm create-teacher -- --username co.khanh --name "Cô Khanh"` đọc `TEACHER_PASSWORD` từ biến môi trường, tạo user Auth + `profiles` teacher cho lớp đang hoạt động.

- [ ] **Step 1: Viết test thất bại** `04_avatar.test.sql`:
  - Với vai học sinh A, cờ bật, avatar hợp lệ → `lives_ok(set_my_avatar)` và `students.avatar_id` đổi.
  - Cờ tắt → `throws_ok(..., 'avatar_not_allowed')`.
  - Avatar `hidden = true` hoặc của lớp khác → `throws_ok(..., 'avatar_not_found')`.
  - Với vai A gọi `set_avatar_for` → `throws_ok(..., 'not_allowed')`; vai T → `lives_ok`.
  - Bucket `class-media` tồn tại với `file_size_limit = 5242880`.
- [ ] **Step 2:** `pnpm db:test` → FAIL.
- [ ] **Step 3:** Viết migration: bucket + policy trên `storage.objects` (teacher insert/update/delete khi `(storage.foldername(name))[1] = private.my_class_id()::text`; người đăng nhập cùng lớp select); hai hàm avatar, `grant execute` cho `authenticated`, ghi `audit_logs` với `action = 'avatar.set'`.
- [ ] **Step 4:** `seed.sql`: lớp seed (trường "Tiểu học Chính Nghĩa", lớp "Năm 8 (5/8)", năm "2026 – 2027", giáo viên "Cô Khanh", slogan "Cùng học – Cùng chơi – Cùng tỏa sáng", học kỳ 1 `2026-09-05`–`2027-01-15`, học kỳ 2 `2027-01-18`–`2027-05-31`); `class_settings` mặc định; 12 avatar preset lấy đúng mảng `LIB` trong `Profile.dc.html` (`label`, `preset = {"hair","hairColor","skin","bg"}`); 10 học sinh mẫu `HS01`–`HS10` tên theo `Students.dc.html`, `is_demo = true`, gắn avatar preset theo thứ tự; 4 tổ như `Students.dc.html` (thành viên, tổ trưởng, tổ phó); tiêu chí cộng/trừ theo mảng `ADD`/`SUB` trong `Stars.dc.html`; môn học theo `Timetable.dc.html`. Mọi dòng mẫu có `is_demo = true` trừ `classes`, `class_settings`, `avatar_library`.
- [ ] **Step 5:** `scripts/seed-dev-users.ts` và `scripts/create-teacher.ts` dùng `createClient(url, serviceRoleKey)` và `auth.admin.createUser({ email: usernameToEmail(u), password, email_confirm: true })` rồi insert `profiles`; idempotent (bỏ qua nếu username đã có). Script `package.json`: `"seed:dev": "tsx scripts/seed-dev-users.ts"`, `"create-teacher": "tsx scripts/create-teacher.ts"`. `usernameToEmail` import từ `lib/auth/username.ts` (Task 5) — nếu Task 5 chưa có, tạo file đó trước với đúng signature ở Task 5.
- [ ] **Step 6:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test` → PASS; chạy `pnpm seed:dev` lần hai → không lỗi.
- [ ] **Step 7:** Commit `feat(db): add storage bucket, avatar functions and seed data`.

---

### Task 5: Supabase client, thư viện auth, định dạng ngày, middleware

**Files:**
- Create: `lib/supabase/{client,server,admin,middleware}.ts`, `lib/auth/{username,session,route-guard}.ts`, `lib/domain/{date,types,theme}.ts`, `lib/errors.ts`, `middleware.ts`
- Test: `tests/unit/username.test.ts`, `tests/unit/route-guard.test.ts`, `tests/unit/date.test.ts`, `tests/unit/errors.test.ts`

**Interfaces:**
- Produces:
  - `normalizeUsername(raw: string): { ok: true; username: string } | { ok: false; error: 'invalid_username' }`
  - `usernameToEmail(username: string): string` (dùng `process.env.AUTH_EMAIL_DOMAIN ?? 'tram58.local'`)
  - `type Role = 'teacher' | 'student'`
  - `type SessionUser = { userId: string; role: Role; classId: string; displayName: string; studentId: string | null; avatarId: string | null }`
  - `getSessionUser(): Promise<SessionUser | null>` (server; đọc `auth.getUser()` + `profiles`; trả `null` nếu không có profile hoặc học sinh đã lưu trữ)
  - `requireTeacher(): Promise<SessionUser>` / `requireStudent(): Promise<SessionUser>` (redirect nếu sai)
  - `resolveRoute(input: { pathname: string; role: Role | null }): { action: 'allow' } | { action: 'redirect'; to: string }`
  - `createBrowserSupabase()`, `createServerSupabase()` (async, cookie qua `next/headers`), `createAdminSupabase()` (file có `import 'server-only'`)
  - `formatVietnameseDate(d: Date): string` → `"Thứ Bảy, 31/10/2026"`; `todayInVietnam(now?: Date): string` → `"YYYY-MM-DD"`
  - `THEMES: Record<'indigo'|'pink'|'mint'|'gold', { label: string; primary: string }>` = Xanh tím `#6675E8`, Hồng sen `#F46FA5`, Xanh mint `#2BB5A4`, Vàng sao `#F5A81C`
  - `toVietnameseMessage(key: string): string`

- [ ] **Step 1: Viết test thất bại:**
  - `username.test.ts`: `normalizeUsername(' Co.Khanh ')` → `{ok:true, username:'co.khanh'}`; `'hs.minhánh'`, `'a b'`, `'ab'`, chuỗi 33 ký tự → `{ok:false}`; `usernameToEmail('co.khanh')` → `'co.khanh@tram58.local'`.
  - `route-guard.test.ts`: `{pathname:'/tong-quan', role:null}` → redirect `'/dang-nhap?next=%2Ftong-quan'`; `{'/tong-quan','student'}` → redirect `'/em'`; `{'/em','teacher'}` → allow; `{'/dang-nhap','teacher'}` → redirect `'/tong-quan'`; `{'/dang-nhap','student'}` → redirect `'/em'`; `{'/trinh-chieu','student'}` → redirect `'/em'`; `{'/_next/static/x', null}` và `{'/brand/logo-truong.jpg', null}` → allow.
  - `date.test.ts`: `formatVietnameseDate(new Date('2026-10-31T03:00:00Z'))` = `'Thứ Bảy, 31/10/2026'`; `formatVietnameseDate(new Date('2026-10-31T23:30:00Z'))` = `'Chủ Nhật, 01/11/2026'`; `todayInVietnam(new Date('2026-10-31T23:30:00Z'))` = `'2026-11-01'`.
  - `errors.test.ts`: `invalid_credentials` → `'Tên đăng nhập hoặc mật khẩu chưa đúng.'`; `invalid_username` → `'Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm và gạch dưới.'`; `no_profile` → `'Tài khoản này chưa được gắn với lớp. Em hãy báo cô giáo nhé.'`; `avatar_not_allowed` → `'Cô chưa bật quyền tự đổi avatar.'`; `avatar_not_found` → `'Avatar này không còn trong thư viện.'`; `not_allowed` → `'Bạn không có quyền làm việc này.'`; `file_too_large` → `'Ảnh lớn hơn 5 MB, cô chọn ảnh nhỏ hơn nhé.'`; `unsupported_type` → `'Chỉ nhận ảnh JPG, PNG hoặc WEBP.'`; khóa lạ → `'Có lỗi xảy ra, vui lòng thử lại.'`.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Cài đặt các hàm. `formatVietnameseDate` dùng `Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', … })` cho ngày/tháng/năm và mảng tên thứ tự viết `['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy']` (không dùng `weekday` của Intl vì viết thường). `resolveRoute`: khu giáo viên = mọi đường dẫn bắt đầu bằng 14 route giáo viên ở `components/layout/nav.ts` + `/trinh-chieu`; khu học sinh `/em`; công khai `/dang-nhap`, `/_next`, `/brand`, `/favicon.ico`. Role lấy trong middleware từ `profiles` qua client middleware (một truy vấn `select role`).
- [ ] **Step 4:** `middleware.ts` theo mẫu `@supabase/ssr` (làm mới phiên, rồi gọi `resolveRoute`); `matcher` loại trừ `_next/static`, `_next/image`, file ảnh.
- [ ] **Step 5:** `pnpm test` → PASS; `pnpm build` → thành công.
- [ ] **Step 6:** Commit `feat(auth): add supabase clients, username auth helpers and route guard`.

---

### Task 6: Trang Đăng nhập

**Files:**
- Create: `app/(auth)/dang-nhap/page.tsx`, `app/(auth)/dang-nhap/LoginForm.tsx`, `app/(auth)/actions.ts`
- Test: `tests/e2e/login.spec.ts`

**Interfaces:**
- Consumes: `normalizeUsername`, `usernameToEmail`, `toVietnameseMessage`, `getSessionUser` (Task 5).
- Produces: `signIn(prev: { error?: string }, form: FormData): Promise<{ error?: string }>` (field `username`, `password`, `next`); `signOut(): Promise<void>` (redirect `/dang-nhap`).

- [ ] **Step 1: Viết e2e thất bại** `login.spec.ts` (cần `pnpm supabase start` và `pnpm seed:dev` trước; đọc mật khẩu từ `scripts/dev-users.json`):
  - Tab "Giáo viên", nhập `co.khanh` + mật khẩu → URL `/tong-quan`.
  - Tab "Học sinh", nhập `hs.hamy` → URL `/em`.
  - Sai mật khẩu → thấy chữ `Tên đăng nhập hoặc mật khẩu chưa đúng.`, vẫn ở `/dang-nhap`.
  - Nhập `hs.minhánh` → thấy thông báo `invalid_username`.
  - Mở `/thoi-khoa-bieu` khi chưa đăng nhập → về `/dang-nhap?next=%2Fthoi-khoa-bieu`; đăng nhập giáo viên → về `/thoi-khoa-bieu`.
  - Tài khoản Auth không có `profiles` (test tạo bằng admin API rồi xóa sau) → thấy thông báo `no_profile`, không vào được `/em`.
  - Trang có ảnh `alt="Logo trường Tiểu học Chính Nghĩa"` và không tràn ngang ở cả ba cỡ (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] **Step 2:** `pnpm test:e2e tests/e2e/login.spec.ts` → FAIL.
- [ ] **Step 3:** Dựng giao diện theo `Login.dc.html` (nền navy, sao nhấp nháy, ảnh ba bạn nhỏ bay `fl`, logo trường cắt tròn, thêm logo lớp `/brand/logo-lop.jpg` cạnh logo trường, chữ "LỚP NĂM 8 (5/8) · TEAM CÔ KHANH", tab Giáo viên/Học sinh đổi nhãn `userLabel`, `userHint` và `note` đúng chuỗi trong thiết kế, bỏ câu "Bản học sinh chưa có trong thiết kế này."; nút "Cất cánh"). Tên lớp, trường lấy từ `classes` của lớp đang hoạt động (`archived_at is null`, lấy bằng admin client ở server vì người dùng chưa đăng nhập; chỉ đọc các cột hiển thị). `LoginForm` dùng `useActionState(signIn)`; nút khóa khi đang gửi.
- [ ] **Step 4:** `signIn`: chuẩn hóa username → `auth.signInWithPassword` → `getSessionUser()`; nếu `null` thì `signOut` phía server và trả `no_profile`; nếu `next` là đường dẫn nội bộ (bắt đầu bằng `/` và không bằng `//`) thì redirect `next`, không thì theo role.
- [ ] **Step 5:** `pnpm test:e2e tests/e2e/login.spec.ts` → PASS.
- [ ] **Step 6:** Commit `feat: add login page`.

---

### Task 7: Thành phần UI dùng chung và Avatar

**Files:**
- Create: `components/ui/{Button,Card,Toggle,Modal,Notice}.tsx`, `components/avatar/{Avatar,AvatarImage}.tsx`, `components/avatar/presets.ts`
- Test: `tests/unit/avatar.test.tsx`, `tests/unit/ui.test.tsx`

**Interfaces:**
- Produces:
  - `type AvatarPreset = { hair: 'a' | 'b' | 'c'; hairColor: string; skin: string; bg: string }`
  - `<Avatar preset={AvatarPreset} size={number} crown?={boolean} />`: SVG chép từ `Avatar.dc.html`; `hair 'a'` hiện tóc chỏm, `'b'` tóc hai bên, `'c'` tóc ngắn; id gradient/clip duy nhất mỗi instance bằng `useId()`.
  - `<AvatarImage avatar={{ kind: 'preset'; preset: AvatarPreset } | { kind: 'upload'; url: string } | null} size={number} />`: `null` → preset mặc định `{hair:'a',hairColor:'#3A2A4D',skin:'#FFD9B8',bg:'#D9D3FF'}`; ảnh tải lên cắt tròn.
  - `<Button variant="primary"|"secondary"|"ghost"|"danger" />` (cao tối thiểu 44px; `primary` nền `primary-strong` chữ trắng); `<Card />` (nền trắng, bo `rounded-card`, bóng `0 6px 20px rgba(102,117,232,.10)`); `<Toggle checked onChange label hint />` (track `#4F5BD5`/`#B9B5E8`, như Settings); `<Modal open onClose title>` (focus trap, Esc đóng); `<Notice tone="success"|"error">`.

- [ ] **Step 1: Viết test thất bại:** `avatar.test.tsx`: render `hair:'b'` → nhóm tóc hai bên có `opacity="1"`, hai nhóm kia `opacity="0"`; `crown` → nhóm vương miện `opacity="1"`; render hai Avatar cùng lúc → không trùng `id`; `AvatarImage avatar={null}` → có `role="img"`. `ui.test.tsx`: `Button` có class `min-h-11`; `Toggle` bấm gọi `onChange(!checked)` và có `role="switch"` + `aria-checked`; `Modal` bấm Esc gọi `onClose`.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Cài đặt các component theo Interfaces.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(ui): add shared UI primitives and avatar`.

---

### Task 8: Khung giao diện giáo viên và học sinh

**Files:**
- Create: `components/layout/{nav.ts,Sidebar.tsx,Header.tsx,ComingSoon.tsx}`, `app/(teacher)/layout.tsx`, 12 trang stub `app/(teacher)/{tong-quan,hoc-sinh,diem-danh,thi-dua,xep-hang,doi-qua,goi-ten,thoi-khoa-bieu,thong-bao,nhiem-vu,bao-cao,cai-dat}/page.tsx` và `app/trinh-chieu/page.tsx`, `app/em/layout.tsx`, `app/em/page.tsx`, `app/not-found.tsx`, `app/error.tsx`
- Test: `tests/e2e/shell.spec.ts`, `tests/unit/nav.test.ts`

**Interfaces:**
- Consumes: `requireTeacher`, `requireStudent`, `formatVietnameseDate`, `THEMES`, `AvatarImage`, `signOut`.
- Produces:
  - `TEACHER_NAV: { id: string; label: string; href: string; icon: string }[]` gồm 14 mục theo đúng thứ tự, nhãn và path SVG trong `Sidebar.dc.html`, href: home→`/tong-quan`, students→`/hoc-sinh`, attendance→`/diem-danh`, stars→`/thi-dua`, rank→`/xep-hang`, rewards→`/doi-qua`, random→`/goi-ten`, timetable→`/thoi-khoa-bieu`, news→`/thong-bao`, missions→`/nhiem-vu`, display→`/trinh-chieu`, report→`/bao-cao`, settings→`/cai-dat`, profile→`/ho-so`.
  - `<Sidebar active={string} teacher={{ displayName; avatar }} classLogoUrl={string|null} />`
  - `<Header title={string} subtitle={string} />` (server component; tự đọc lớp, ngày, người dùng)
  - `<ComingSoon title={string} />`: thẻ "Trang này đang được xây dựng." dùng cho stub, sẽ bị thay ở các đợt sau.
  - Layout giáo viên đặt `style={{ '--primary': THEMES[class.theme].primary }}`.

- [ ] **Step 1: Viết test thất bại:** `nav.test.ts`: `TEACHER_NAV.length === 14`, nhãn đầu `'Tổng quan'`, nhãn cuối `'Hồ sơ và avatar'`, mọi `href` là duy nhất. `shell.spec.ts` (đăng nhập `co.khanh`):
  - `/tong-quan` có Sidebar với 14 link; link "Tổng quan" có `aria-current="page"`; Header có "Lớp Năm 8 (5/8) · 2026 – 2027" và ngày dạng `Thứ …, dd/mm/yyyy`.
  - Bấm từng link Sidebar → URL đúng, không trang nào lỗi 500.
  - Ở cỡ `mobile`: danh sách menu cuộn ngang (`flex-direction: row`), khối chân menu ẩn, trang không tràn ngang.
  - Đổi `classes.theme` sang `'pink'` (admin client trong test), tải lại → CSS var `--primary` đọc trên phần tử layout bằng `getComputedStyle(el).getPropertyValue('--primary').trim()` = `#F46FA5`; trả lại `'indigo'` sau test.
  - Nút "Đăng xuất" ở Header → về `/dang-nhap`.
  - Đăng nhập `hs.hamy` → `/em` hiện "Xin chào, Hà My!"; mở `/hoc-sinh` → bị đưa về `/em`.
  - Chụp ảnh `/tong-quan` ở ba cỡ, lưu `test-results/shell-<project>.png`.
- [ ] **Step 2:** `pnpm test && pnpm test:e2e tests/e2e/shell.spec.ts` → FAIL.
- [ ] **Step 3:** `Sidebar` theo `Sidebar.dc.html`: logo trường tròn + "TRƯỜNG TIỂU HỌC / CHÍNH NGHĨA"; logo lớp (`classes.class_logo_path` qua signed URL, không có thì dùng `/brand/logo-lop.jpg`) thay hình hành tinh, cạnh "TRẠM KHÔNG GIAN / NĂM 8"; mục đang chọn nền `rgba(255,255,255,.18)` icon `#FFD36B`; chân menu có avatar + tên giáo viên + "Giáo viên – Admin" (bỏ dòng "Bản thiết kế: dữ liệu demo…"). Responsive ≤760px như CSS gốc. `Header` theo `Header.dc.html`; nút chuông dẫn tới `/thong-bao` và chưa hiện số (đếm thông báo làm ở đợt 4); nút "Đăng xuất" gọi `signOut`. Layout giáo viên: flex hai cột như `Main.dc.html` (cột Sidebar `flex:1 1 248px; max-width:272px`, nội dung `flex:999 1 560px`), padding 16px, gap 20px.
- [ ] **Step 4:** Stub trang: mỗi trang `requireTeacher()` (qua layout), render `<Header title=… subtitle=…/>` với title đúng nhãn menu và `<ComingSoon/>`. `app/em/layout.tsx` gọi `requireStudent()` (teacher được xem); `app/em/page.tsx` stub "Xin chào, <tên gọi>!" (tên gọi = hai chữ cuối của họ tên, ví dụ "Võ Hà My" → "Hà My"). `/trinh-chieu` stub nền navy, không Sidebar. `not-found.tsx`, `error.tsx` tiếng Việt, có nút về trang chủ.
- [ ] **Step 5:** `pnpm test && pnpm test:e2e tests/e2e/shell.spec.ts` → PASS.
- [ ] **Step 6:** Commit `feat: add teacher and student layouts with sidebar and header`.

---

### Task 9: Trang Hồ sơ và avatar

**Files:**
- Create: `app/(teacher)/ho-so/page.tsx`, `app/(teacher)/ho-so/ProfileClient.tsx`, `app/(teacher)/ho-so/actions.ts`
- Test: `tests/e2e/profile.spec.ts`, `tests/unit/upload-validate.test.ts`

**Interfaces:**
- Consumes: `set_avatar_for` (Task 4), bucket `class-media`, `AvatarImage`, `Toggle`, `toVietnameseMessage`.
- Produces:
  - `validateImageFile(file: { size: number; type: string }): { ok: true } | { ok: false; error: 'file_too_large' | 'unsupported_type' }` trong `lib/domain/upload.ts`
  - Server Actions: `saveAvatar(profileId: string, avatarId: string): Promise<{ error?: string }>`, `uploadAvatar(form: FormData): Promise<{ error?: string; avatarId?: string }>` (field `file`, `label`), `setStudentCanChangeAvatar(on: boolean): Promise<{ error?: string }>`

- [ ] **Step 1: Viết test thất bại:** `upload-validate.test.ts`: 5 242 880 byte `image/png` → ok; 5 242 881 → `file_too_large`; `image/gif` → `unsupported_type`. `profile.spec.ts` (giáo viên):
  - Cột trái liệt kê "Cô Khanh" và 10 học sinh mẫu; chọn "Võ Hà My" → khối hiện tại ghi "HỌC SINH" và tên.
  - Chọn avatar "Phi hành gia 3" → "Đang chọn: Phi hành gia 3" → "Lưu avatar" → tải lại trang, Hà My vẫn mang avatar đó.
  - Tải ảnh PNG nhỏ (fixture `tests/e2e/fixtures/avatar.png`) → xuất hiện trong thư viện; tải file 6 MB (tạo trong test) → thấy `Ảnh lớn hơn 5 MB, cô chọn ảnh nhỏ hơn nhé.` và số ô thư viện không đổi.
  - Tắt "Quyền đổi avatar của học sinh" → tải lại vẫn tắt (`class_settings.student_can_change_avatar = false`); bật lại cuối test.
- [ ] **Step 2:** `pnpm test && pnpm test:e2e tests/e2e/profile.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo `Profile.dc.html` (lưới người, khối avatar hiện tại, thư viện, "Tải avatar lên (chỉ giáo viên)", "Lưu avatar", công tắc với chữ hướng dẫn đúng thiết kế). Đổi câu "Chỉ gồm các avatar cô đã tải lên." thành "Gồm các avatar có sẵn và avatar cô đã tải lên." vì thư viện có preset (spec mục 4, Avatar). Ảnh tải lên: kiểm tra bằng `validateImageFile` ở client và lại ở server, lưu `class-media/<class_id>/avatars/<uuid>.<ext>`, tạo dòng `avatar_library(kind='upload', image_path, label)`; hiển thị bằng signed URL 1 giờ.
- [ ] **Step 4:** `pnpm test && pnpm test:e2e` (toàn bộ) → PASS.
- [ ] **Step 5:** Commit `feat: add profile and avatar library page`.

---

### Task 10: Kiểm tra cuối đợt

- [ ] **Step 1:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm build && pnpm test:e2e` → tất cả PASS.
- [ ] **Step 2:** Mở ảnh `test-results/shell-*.png` ở ba cỡ, so với `Main.dc.html` và `Login.dc.html` về bố cục, màu, chữ; ghi khác biệt còn lại vào `docs/superpowers/plans/2026-10-31-dot-1-ghi-chu.md`.
- [ ] **Step 3:** Commit `chore: phase 1 verification notes`.
