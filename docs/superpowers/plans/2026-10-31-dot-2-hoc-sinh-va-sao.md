# Đợt 2: Học sinh và sao – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chạy thật bốn màn hình Quản lý học sinh, Trạm thi đua, Bảng xếp hạng và Tổng quan trên sổ sao an toàn (không âm, không hoàn tác hai lần, không lệch lớp), kèm các việc đợt 1 chuyển sang.

**Architecture:** Mọi thay đổi sao đi qua hàm Postgres `security definer` khóa dòng học sinh trước khi đọc số dư; trigger bảo vệ bất biến của sổ cái. Trang đọc dữ liệu ở Server Component, ghi qua Server Action gọi `rpc`. Logic thuần (kỳ thời gian, ghép tên, giờ tương đối, tìm kiếm không dấu) nằm trong `lib/` có unit test.

**Tech Stack:** như đợt 1 (Next.js 15, React 19, Tailwind v4, Supabase, pgTAP, Vitest, Playwright) + `xlsx` (SheetJS) cho nhập/xuất.

**Spec:** `docs/superpowers/specs/2026-10-31-tram-khong-gian-nam-8-design.md` (mục 4, 5, 6, 7). Bản vẽ: `design/project/{Students,Stars,Leaderboard,Main}.dc.html`. Việc chuyển tiếp: `docs/superpowers/plans/2026-10-31-dot-1-viec-chuyen-tiep.md` (mục Đợt 2).

## Global Constraints

- Mọi ràng buộc ở Global Constraints của plan đợt 1 vẫn áp dụng (màu, phông, 44px, chữ tiếng Việt chép từ `.dc.html`, giờ `Asia/Ho_Chi_Minh`, `service_role` chỉ trong file `server-only`, hàm `security definer` + `set search_path = ''`, helper trong `private`).
- Migration đánh số tay tiếp theo: `20261101000007_…`, `…0008_…`, … Không dùng `supabase migration new`.
- Từ đợt 1, hàm mới **không** tự có EXECUTE cho PUBLIC/anon: mỗi hàm `public.*` gọi từ app phải `grant execute … to authenticated`; hàm `private.*` dùng trong policy/view phải `grant execute … to authenticated`.
- Mọi Server Action gọi `requireTeacher()` đầu tiên và kiểm tra input bằng `zod` (uuid, số nguyên dương, chuỗi ≤ 200 ký tự).
- Mọi hàm đổi sao khóa `select … from public.students where id = any(…) order by id for update` trước khi đọc số dư.
- Sao khả dụng không bao giờ âm; lỗi là mã `P0001` với message là khóa lỗi, map sang tiếng Việt ở `lib/errors.ts`.
- Nút gửi khóa trong lúc chờ (`useTransition`), làm mới bằng `revalidatePath`.
- `star_steps` của `class_settings` là các mức cộng; mức trừ là các phần tử `≤ 5` của `star_steps`.
- Không thêm tính năng ngoài bản vẽ và spec.

## Review Focus

1. Hai thao tác cùng lúc làm sao khả dụng âm (cô trừ 5 sao trong lúc lượt hoàn tác một lần cộng 5 sao chạy, số dư 5) → chỉ một thao tác thành công, cái kia báo `insufficient_stars`. Test ở Task 2 bằng hai lần gọi nối tiếp trên cùng số dư (khóa dòng được kiểm bằng đọc lại số dư sau khóa).
2. Bấm "Hoàn tác" hai lần, hoặc hoàn tác một bản ghi hoàn tác → lần sau báo "Bản ghi này đã được hoàn tác." / bị chặn, sổ không đổi. Test ở Task 2 và Task 6.
3. Tìm kiếm gõ không dấu hoặc có "đ" (`"dung"` tìm ra "Phạm Đức Dũng", `"hs04"` ra mã HS04) → đúng học sinh. Test ở Task 4.
4. Bảng xếp hạng ở ranh giới kỳ: giao dịch lúc 23:30 thứ Bảy giờ Việt Nam (16:30 UTC) thuộc tuần đó, giao dịch 00:10 thứ Hai (17:10 UTC Chủ nhật) thuộc tuần mới. Test ở Task 4 và Task 3.
5. Nhập file có dòng trống, tên trùng mã đã có, hoặc cột thiếu → bước xem trước đánh dấu dòng lỗi, không ghi gì cho tới khi cô xác nhận; dòng lỗi bị bỏ qua. Test ở Task 10.

## Sơ đồ file

```
supabase/migrations/20261101000007_ledger_hardening.sql
supabase/migrations/20261101000008_star_functions.sql
supabase/migrations/20261101000009_leaderboard.sql
supabase/migrations/20261101000010_students_admin.sql
supabase/migrations/20261101000011_groups.sql
supabase/tests/07_ledger_hardening.test.sql … 11_groups.test.sql
lib/domain/period.ts, lib/domain/relative-time.ts, lib/domain/vn-text.ts, lib/domain/names.ts
lib/stars/history.ts, lib/stars/queries.ts, lib/avatars/resolve.ts
lib/students/import.ts, lib/students/export.ts
components/ui/Modal.tsx (sửa), components/stars/StarBurst.tsx
app/(teacher)/thi-dua/{page.tsx,StarsClient.tsx,actions.ts}
app/(teacher)/xep-hang/{page.tsx,LeaderboardClient.tsx}
app/(teacher)/hoc-sinh/{page.tsx,StudentsClient.tsx,GroupsView.tsx,ProfilePanel.tsx,StudentForm.tsx,ImportDialog.tsx,actions.ts}
app/(teacher)/tong-quan/page.tsx
tests/unit/*.test.ts, tests/e2e/{stars,leaderboard,students,students-import,overview}.spec.ts
```

---

### Task 1: Gia cố sổ sao và dọn việc đợt 1

**Files:**
- Create: `supabase/migrations/20261101000007_ledger_hardening.sql`, `supabase/tests/07_ledger_hardening.test.sql`
- Modify: `supabase/tests/04_avatar.test.sql:55`, `tests/e2e/profile.spec.ts:114`

**Interfaces:**
- Produces:
  - Cột `star_transactions.batch_id uuid null` + chỉ mục `(class_id, batch_id)`.
  - Trigger `private.check_star_transaction()` `before insert` trên `star_transactions`:
    - `kind='reversal'`: gốc phải có `kind in ('award','penalty')`, cùng `student_id`, `delta = -gốc.delta` → nếu sai `raise exception 'invalid_reversal'`.
    - `criterion_id` khác null: `kind='award'` cần tiêu chí `kind='award'`, `kind='penalty'` cần tiêu chí `kind='penalty'`, loại khác phải null → nếu sai `'criterion_mismatch'`.
  - `alter table public.students add constraint students_class_code_key unique (class_id, code)`.
  - Partial unique index: một `leader` và một `deputy` mỗi tổ: `unique (group_id) where role = 'leader'`, tương tự `deputy`.
  - `alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;`

- [ ] **Step 1: Viết test thất bại** `07_ledger_hardening.test.sql`:
  - Reversal của `reserve` → `throws_ok(…, 'P0001', 'invalid_reversal')`; reversal của award +3 với delta −2 → `invalid_reversal`; reversal khác `student_id` gốc → `invalid_reversal`; reversal đúng (−3) → `lives_ok`.
  - Award với tiêu chí `penalty` → `criterion_mismatch`; reserve có `criterion_id` → `criterion_mismatch`.
  - Insert học sinh trùng `(class_id, code)` → `throws_ok(…, '23505')`; cùng mã ở lớp khác → `lives_ok`.
  - Hai `leader` cùng tổ → `23505`.
  - Bảng tạo sau migration trong test (`create table public.__t(id int)`) → `has_table_privilege('anon','public.__t','truncate')` là false.
  - Cột `batch_id` tồn tại (`has_column`).
- [ ] **Step 2:** `pnpm supabase db reset && pnpm db:test` → FAIL ở 07.
- [ ] **Step 3:** Viết migration theo Interfaces. Kiểm tra seed hiện có không vi phạm (tổ trong seed có đúng 1 leader, 1 deputy).
- [ ] **Step 4:** Sửa `04_avatar.test.sql:55`: đếm `audit_logs` với `action='avatar.set'` **và** `entity_id` thuộc các id do test tạo (không đếm dòng có sẵn). Sửa `profile.spec.ts:114`: `noisePng(1000)` và thêm assert đối tượng lưu trong bucket có đuôi `.webp` hoặc `.jpg`.
- [ ] **Step 5:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test` → PASS; chạy `pnpm test:e2e tests/e2e/profile.spec.ts` rồi `pnpm db:test` lần nữa (không reset) → vẫn PASS.
- [ ] **Step 6:** Commit `feat(db): harden star ledger and carry over phase 1 follow-ups`.

---

### Task 2: Hàm cộng, trừ, hoàn tác sao

**Files:**
- Create: `supabase/migrations/20261101000008_star_functions.sql`, `supabase/tests/08_star_functions.test.sql`
- Modify: `lib/errors.ts`, `tests/unit/errors.test.ts`

**Interfaces:**
- Consumes: `batch_id`, trigger Task 1; `private.is_teacher()`, `private.my_class_id()`.
- Produces (tất cả `security definer`, `set search_path = ''`, grant `authenticated`, ghi `audit_logs` với `class_id`):
  - `public.award_stars(p_student_ids uuid[], p_points int, p_criterion_id uuid, p_note text) returns uuid` — trả `batch_id`; `audit action 'stars.award'`.
  - `public.penalize_stars(p_student_ids uuid[], p_points int, p_criterion_id uuid, p_note text) returns uuid` — `'stars.penalize'`.
  - `public.reverse_batch(p_batch_id uuid) returns uuid` — trả `batch_id` mới; `'stars.reverse'`.
  - Lỗi: `not_allowed` (không phải teacher), `no_students` (mảng rỗng/null), `invalid_points` (ngoài 1..100), `student_not_found` (id không thuộc lớp hoặc đã lưu trữ), `reason_required` (không tiêu chí và note rỗng sau trim), `criterion_mismatch` (tiêu chí sai loại, đã lưu trữ hoặc khác lớp), `insufficient_stars` (với `using detail = <danh sách student_id cách nhau dấu phẩy>`), `batch_not_found`, `already_reversed` (batch đã có reversal, hoặc batch là reversal).
  - Thứ tự trong hàm: kiểm quyền → kiểm input → khóa `students … order by id for update` → đọc số dư từ `star_transactions` → ghi. Trùng id trong mảng được loại bỏ.
  - `reverse_batch` của batch cộng: mỗi học sinh cần `available_stars ≥ points` của dòng gốc, không thì `insufficient_stars`. Batch trừ thì luôn hoàn tác được.
- Thêm vào `lib/errors.ts`: `no_students` → `'Cô hãy chọn ít nhất một học sinh.'`; `invalid_points` → `'Số sao phải lớn hơn 0.'`; `reason_required` → `'Cô hãy chọn một tiêu chí hoặc nhập lý do.'`; `criterion_mismatch` → `'Tiêu chí này không còn dùng được.'`; `student_not_found` → `'Không tìm thấy học sinh trong lớp.'`; `batch_not_found` → `'Không tìm thấy bản ghi.'`; `already_reversed` → `'Bản ghi này đã được hoàn tác.'`; `insufficient_stars` → `'Không đủ sao khả dụng.'` (câu có tên do trang ghép, Task 6).

- [ ] **Step 1: Viết test thất bại** `08_star_functions.test.sql` (lớp A có T, học sinh A1, A2; lớp B có T2, B1):
  - T `award_stars([A1,A2], 2, <tiêu chí award>, '')` → 2 dòng cùng `batch_id`, `v_student_stars` của A1: `competition 2`, `available 2`.
  - Trùng id `[A1,A1]` → chỉ 1 dòng.
  - `penalize_stars([A1], 3, …)` khi A1 có 2 → `throws_ok(…,'P0001','insufficient_stars')`, sổ không đổi; `penalize_stars([A1], 2, null, 'Mất trật tự')` → `lives_ok`, available 0.
  - Mỗi mã lỗi trong Interfaces có ít nhất một `throws_ok` (T2 gọi với B1 trên học sinh lớp A → `student_not_found`; học sinh gọi → `not_allowed`; `p_points = 0` và `101` → `invalid_points`).
  - `reverse_batch(batch cộng)` khi A2 còn 2 → `lives_ok`, competition A2 về 0; gọi lại → `already_reversed`; `reverse_batch(<batch reversal>)` → `already_reversed`.
  - Review Focus 1: A1 có 5 (award 5, batch X). `penalize_stars([A1],5,…)` → ok (available 0); sau đó `reverse_batch(X)` → `insufficient_stars`. Ngược thứ tự trên học sinh khác cũng chỉ một cái thành công.
  - `audit_logs` có `stars.award`, `stars.penalize`, `stars.reverse` với `class_id` lớp A.
  - anon không có EXECUTE trên ba hàm.
- [ ] **Step 2:** `pnpm db:test` → FAIL.
- [ ] **Step 3:** Viết migration theo Interfaces; thêm khóa lỗi vào `lib/errors.ts` và test unit tương ứng.
- [ ] **Step 4:** `pnpm supabase db reset && pnpm db:test && pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(db): add award, penalize and reverse star functions`.

---

### Task 3: Bảng xếp hạng theo kỳ (DB)

**Files:**
- Create: `supabase/migrations/20261101000009_leaderboard.sql`, `supabase/tests/09_leaderboard.test.sql`

**Interfaces:**
- Produces: `public.leaderboard_between(p_from timestamptz, p_to timestamptz) returns table (student_id uuid, full_name text, avatar_id uuid, roll_no int, stars int, rank int)` — `stable security definer`; lớp của người gọi; bỏ học sinh lưu trữ; chỉ chạy khi `private.is_teacher() or private.setting_on('student_can_view_rank')` (không thì trả rỗng); `stars` = tổng `delta` của `award`, `penalty`, `reversal` có `created_at >= p_from` (bỏ qua nếu null) và `< p_to` (bỏ qua nếu null); học sinh không có giao dịch được 0; `rank = rank() over (order by stars desc)`; sắp `stars desc, roll_no asc`.

- [ ] **Step 1: Viết test thất bại** (kèm các test đợt 1 còn thiếu):
  - Kỳ `[2026-10-25 17:00Z, 2026-11-01 17:00Z)` (tuần thứ Hai 26/10 – Chủ nhật 01/11 giờ Việt Nam): giao dịch `2026-10-31 16:30Z` được tính, `2026-11-01 17:10Z` không.
  - Hai học sinh cùng 5 sao → cùng `rank 1`, người tiếp theo `rank 3`.
  - Học sinh lưu trữ không xuất hiện; học sinh lớp B không xuất hiện.
  - Vai học sinh, cờ `student_can_view_rank` tắt → 0 dòng; bật → đủ dòng, không có cột ghi chú.
  - `v_leaderboard_public`: tắt cờ → 0 dòng với học sinh; học sinh lưu trữ và lớp khác không xuất hiện.
  - `v_my_star_history` với cờ `student_can_view_history` tắt → 0 dòng.
  - `v_student_stars`: sau award +5 rồi reverse → `competition 0`, `available 0`.
- [ ] **Step 2:** `pnpm db:test` → FAIL.
- [ ] **Step 3:** Viết migration; insert giao dịch test với `created_at` tường minh.
- [ ] **Step 4:** `pnpm supabase db reset && pnpm db:test` → PASS.
- [ ] **Step 5:** Commit `feat(db): add period leaderboard function`.

---

### Task 4: Thư viện dùng chung (kỳ, giờ tương đối, tên, tìm kiếm, avatar)

**Files:**
- Create: `lib/domain/period.ts`, `lib/domain/relative-time.ts`, `lib/domain/vn-text.ts`, `lib/domain/names.ts`, `lib/avatars/resolve.ts`
- Modify: `lib/layout/shell-data.ts`, `app/(teacher)/ho-so/page.tsx` (dùng `resolveAvatars`)
- Test: `tests/unit/{period,relative-time,vn-text,names,resolve-avatars}.test.ts`

**Interfaces:**
- Produces:
  - `type Period = 'week' | 'month' | 'term' | 'year'`; `PERIOD_LABELS: Record<Period,string>` = `{ week:'Tuần này', month:'Tháng này', term:'Học kỳ', year:'Cả năm' }`.
  - `periodRange(period: Period, now: Date, terms: { term1Start: string; term1End: string; term2Start: string; term2End: string }): { from: string | null; to: string | null }` — ISO UTC; tuần thứ Hai 00:00 → thứ Hai sau 00:00 giờ Việt Nam; tháng đầu tháng → đầu tháng sau; học kỳ: nếu `now ≥ term2Start` dùng học kỳ 2, không thì học kỳ 1, `to` = ngày cuối + 1 ngày 00:00; `year` → `{from:null,to:null}`.
  - `formatRelative(at: Date, now: Date): string` → `'Vừa xong'` (< 1 phút), `'N phút trước'` (< 60), `'N giờ trước'` (cùng ngày Việt Nam), `'Hôm qua'`, còn lại `'dd/mm'`.
  - `formatDayLabel(at: Date, now: Date): string` → `'Hôm nay'`, `'Hôm qua'`, `'dd/mm'`.
  - `normalizeVn(text: string): string` — chữ thường, `đ→d`, bỏ dấu (NFD).
  - `matchesSearch(query: string, fields: string[]): boolean` — query rỗng → true.
  - `givenNameKey(fullName: string): string` — `<tên> <họ tên đầy đủ>` để sắp theo tên (như `Students.dc.html`); so sánh bằng `localeCompare(…, 'vi')`.
  - `joinNames(names: string[]): string` — ≤ 2 tên: nối `', '`; > 2: `'A, B và N bạn khác'`.
  - `type AvatarValue` (đã có ở shell-data) chuyển sang `lib/avatars/resolve.ts`; `resolveAvatars(ids: (string|null)[]): Promise<Map<string, AvatarValue>>` — một truy vấn `avatar_library` + một lần `createSignedUrls` (3600s); `resolveAvatar` giữ làm wrapper.

- [ ] **Step 1: Viết test thất bại:**
  - `period`: `periodRange('week', new Date('2026-10-31T16:30:00Z'), T)` = `{from:'2026-10-25T17:00:00.000Z', to:'2026-11-01T17:00:00.000Z'}`; `periodRange('week', new Date('2026-11-01T17:10:00Z'), T).from` = `'2026-11-01T17:00:00.000Z'`; `month` lúc `2026-10-31T18:00:00Z` (01/11 VN) → from `'2026-10-31T17:00:00.000Z'`; `term` với `T = {term1Start:'2026-09-05', term1End:'2027-01-15', term2Start:'2027-01-18', term2End:'2027-05-31'}` lúc 2026-11 → from `'2026-09-04T17:00:00.000Z'`, to `'2027-01-15T17:00:00.000Z'`; lúc 2027-02 → học kỳ 2; `year` → nulls.
  - `relative-time`: 30 giây → `'Vừa xong'`; 10 phút → `'10 phút trước'`; 3 giờ cùng ngày → `'3 giờ trước'`; hôm qua → `'Hôm qua'`; 28/10 khi nay 31/10 → `'28/10'`; `formatDayLabel` tương ứng.
  - `vn-text`: `matchesSearch('dung', ['Phạm Đức Dũng','HS04'])` true; `matchesSearch('hs04', …)` true; `matchesSearch('DŨNG', …)` true; `matchesSearch('lan', …)` false; sắp `['Nguyễn Minh Anh','Trần Gia Bảo','Đỗ Anh Thư']` theo `givenNameKey` → Anh, Bảo, Thư.
  - `names`: 1 tên, 2 tên → `'A, B'`, 4 tên → `'A, B và 2 bạn khác'`.
  - `resolve-avatars`: mock Supabase client; 3 id (2 preset, 1 upload) → gọi `createSignedUrls` đúng 1 lần.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Cài đặt; sửa `shell-data.ts` và `ho-so/page.tsx` dùng `resolveAvatars` (không đổi hành vi).
- [ ] **Step 4:** `pnpm test && pnpm build && pnpm test:e2e tests/e2e/profile.spec.ts tests/e2e/shell.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add period, time, search and avatar helpers`.

---

### Task 5: Modal dùng được cho hộp xác nhận

**Files:**
- Modify: `components/ui/Modal.tsx`
- Test: `tests/unit/ui.test.tsx`

**Interfaces:**
- Produces: `<Modal open onClose title>` giữ nguyên props; render qua `createPortal` vào `document.body`; khi mở: `body` khóa cuộn (`overflow: hidden`, trả lại giá trị cũ khi đóng), các con trực tiếp khác của `body` có `inert`; nhiều modal chồng nhau thì Esc chỉ đóng modal mở sau cùng.

- [ ] **Step 1: Viết test thất bại:** modal mở → `document.body.style.overflow === 'hidden'`, đóng → trả về `''`; nội dung modal nằm ngoài container render (portal); hai modal mở, Esc → chỉ `onClose` của modal thứ hai được gọi; modal không có phần tử focus được → Tab giữ focus trong dialog.
- [ ] **Step 2:** `pnpm test` → FAIL.
- [ ] **Step 3:** Cài đặt (stack modal ở biến module).
- [ ] **Step 4:** `pnpm test && pnpm build` → PASS.
- [ ] **Step 5:** Commit `feat(ui): portal, scroll lock and stacking for Modal`.

---

### Task 6: Trạm thi đua (`/thi-dua`)

**Files:**
- Create: `app/(teacher)/thi-dua/{page.tsx,StarsClient.tsx,actions.ts}`, `lib/stars/history.ts`, `lib/stars/queries.ts`, `components/stars/StarBurst.tsx`
- Test: `tests/unit/star-history.test.ts`, `tests/e2e/stars.spec.ts`

**Interfaces:**
- Consumes: hàm Task 2; `joinNames`, `formatRelative` (Task 4); `resolveAvatars`; `Modal` (Task 5); `Button`, `Notice`, `Card`.
- Produces:
  - `lib/stars/queries.ts`: `getStudentsWithStars(classId: string): Promise<{ id: string; fullName: string; rollNo: number; avatar: AvatarValue; competition: number; available: number; groupId: string | null }[]>` (học sinh chưa lưu trữ, sắp `roll_no`); `getRecentBatches(classId: string, limit: number): Promise<StarBatch[]>`.
  - `lib/stars/history.ts`: `type StarBatch = { batchId: string; studentIds: string[]; delta: number; kind: 'award'|'penalty'|'reversal'; reason: string; at: string; actorName: string; reversed: boolean }`; `groupBatches(rows: TxRow[], criteriaLabels: Map<string,string>, actorNames: Map<string,string>): StarBatch[]` — gom theo `batch_id`, `reason` = `[nhãn tiêu chí, note.trim()]` bỏ rỗng nối `' – '`; reversal có `reason = 'Hoàn tác: ' + reason của batch gốc`; `reversed` = có batch reversal trỏ vào.
  - Server Actions: `awardStars(input: { studentIds: string[]; points: number; criterionId: string | null; note: string }): Promise<{ error?: string; message?: string }>`; `penalizeStars(same)`; `undoBatch(batchId: string)`; `saveCriterion(input: { id?: string; kind: 'award'|'penalty'; label: string; defaultPoints: number })`; `archiveCriterion(id: string)`.
  - Câu thông báo (chép từ `Stars.dc.html`, bỏ đuôi "Số sao đã cập nhật trên màn hình."): `'Đã cộng N sao cho <joinNames>.'`, `'Đã trừ N sao cho <joinNames>.'`, `'Đã hoàn tác. Hệ thống ghi thêm một bản ghi mới, bản ghi cũ vẫn được giữ.'`. Lỗi `insufficient_stars` khi trừ: `'Không đủ sao khả dụng để trừ: <joinNames>. Cô hãy giảm số sao hoặc xử lý riêng.'`; khi hoàn tác: `'Không thể hoàn tác vì <joinNames> không đủ sao khả dụng.'` — tên lấy từ `error.details`.

- [ ] **Step 1: Viết test thất bại:**
  - `star-history.test.ts`: 3 dòng cùng batch → 1 `StarBatch` với 3 id; reason ghép `'Giúp đỡ bạn bè – Rất nhiệt tình'`; batch có reversal → `reversed: true`, batch reversal có reason `'Hoàn tác: Giúp đỡ bạn bè'`.
  - `stars.spec.ts` (giáo viên, sau `db reset` + `seed:dev`):
    - Chọn "Tổ 1 (3 bạn)" → "1. Chọn học sinh (đã chọn 3)"; chọn tiêu chí "Giúp đỡ bạn bè" (+2) → "Xác nhận cộng sao" → thấy `Đã cộng 2 sao cho Nguyễn Minh Anh, Trần Gia Bảo và 1 bạn khác.` và thẻ học sinh hiện `2 sao khả dụng`; lịch sử có dòng `+2`.
    - Không chọn ai → bấm xác nhận → `Cô hãy chọn ít nhất một học sinh.`; chọn bạn nhưng không tiêu chí, không ghi chú → `Cô hãy chọn một tiêu chí hoặc nhập lý do.`
    - Chế độ "− Trừ sao", chọn bạn có 0 sao, −1, tiêu chí "Mất trật tự" → `Không đủ sao khả dụng để trừ: …`; bạn có 2 sao, −1 → hộp xác nhận hiện `Cô muốn trừ 1 sao của <tên> với lý do "Mất trật tự"?` → "Hủy" không ghi gì; lặp lại → "Đồng ý trừ sao" → `Đã trừ 1 sao cho <tên>.`
    - "Hoàn tác" dòng cộng → thông báo hoàn tác, dòng cũ hiện "Đã hoàn tác", dòng mới hiện "Đã ghi"; bấm lại "Đã hoàn tác" không đổi gì (nút disabled).
    - "+ Thêm tiêu chí" → tên "Đọc sách", 2 sao → xuất hiện trong danh sách và trong lựa chọn tiêu chí cộng.
    - Ảnh chụp `test-results/stars-{project}.png`.
- [ ] **Step 2:** `pnpm test && pnpm test:e2e tests/e2e/stars.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo `Stars.dc.html`: hai khối "1. Chọn học sinh" (Chọn cả lớp, Bỏ chọn, nút từng tổ, thẻ học sinh có số sao khả dụng) và "2. Chọn thao tác và lý do" (Cộng/Trừ, mức sao từ `star_steps`, ô tùy chỉnh, tiêu chí, ghi chú, tóm tắt, nút xác nhận); hộp xác nhận trừ dùng `Modal`; `StarBurst` là animation 7 ngôi sao (`flyA/flyB`) chạy khi cộng thành công, tôn trọng `prefers-reduced-motion`; "Lịch sử giao dịch sao" 6 batch gần nhất; "Quản lý tiêu chí" (thêm, sửa tên/số sao, lưu trữ thay vì xóa). Chọn tiêu chí đặt số sao bằng `default_points`. Đổi chế độ đặt lại mức về 2 (cộng) hoặc 1 (trừ), như thiết kế.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm test:e2e tests/e2e/stars.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add stars station page`.

---

### Task 7: Bảng xếp hạng (`/xep-hang`)

**Files:**
- Create: `app/(teacher)/xep-hang/{page.tsx,LeaderboardClient.tsx}`
- Test: `tests/e2e/leaderboard.spec.ts`

**Interfaces:**
- Consumes: `leaderboard_between` (Task 3), `periodRange`, `PERIOD_LABELS` (Task 4), `resolveAvatars`, `Avatar` (`crown` cho hạng 1).
- Produces: trang đọc `?ky=week|month|term|year` (mặc định `year`, như thiết kế) và `?tat-ca=1`.

- [ ] **Step 1: Viết test thất bại** `leaderboard.spec.ts`: tạo dữ liệu bằng admin client (`award_stars` qua RPC với phiên giáo viên, hoặc insert trực tiếp bằng service role với `batch_id`): A 5 sao, B 5 sao, C 3 sao trong tuần, D 10 sao từ tháng trước.
  - Tab "Tuần này" → bục vinh danh: A và B cùng "Huy chương vàng"/hạng 1, C hạng 3; dòng chú thích "Bằng điểm thì cùng thứ hạng. Hệ thống không ưu tiên theo giới tính hay tên."
  - Tab "Cả năm" → D đứng đầu với 10 sao.
  - Mặc định 5 dòng, "Xem toàn bộ bảng" → 10 dòng, tiêu đề "Toàn bộ bảng xếp hạng (10 bạn)"; "Chỉ xem Top 5" thu lại.
  - Lớp chưa có giao dịch nào → mọi bạn 0 sao, cùng hạng 1, không lỗi.
  - Dọn dữ liệu test sau mỗi test (xóa bằng service role theo `batch_id`).
- [ ] **Step 2:** `pnpm test:e2e tests/e2e/leaderboard.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo `Leaderboard.dc.html` (tab kỳ, bục 3 bậc thứ tự 2–1–3 với màu khối và kích thước avatar 92/118/92, danh sách có thanh phần trăm so với người đầu, nền `#FFF8E6` cho hạng ≤ 3). Ít hơn 3 học sinh → bục chỉ hiện số bậc có người. Người đầu 0 sao → thanh phần trăm 0.
- [ ] **Step 4:** `pnpm lint && pnpm test:e2e tests/e2e/leaderboard.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add leaderboard page`.

---

### Task 8: Quản lý học sinh – danh sách, hồ sơ, thêm/sửa/lưu trữ (`/hoc-sinh`)

**Files:**
- Create: `supabase/migrations/20261101000010_students_admin.sql`, `supabase/tests/10_students_admin.test.sql`, `app/(teacher)/hoc-sinh/{page.tsx,StudentsClient.tsx,ProfilePanel.tsx,StudentForm.tsx,actions.ts}`
- Test: `tests/e2e/students.spec.ts`

**Interfaces:**
- Consumes: `getStudentsWithStars` (Task 6), `matchesSearch`, `givenNameKey`, `formatDayLabel` (Task 4), `v_student_stars`, `leaderboard_between(null,null)` cho thứ hạng cả năm.
- Produces:
  - `public.next_student_code(p_class_id uuid) returns text` — `'HS' || lpad(n, 2, '0')` với n = số lớn nhất hiện có + 1 (teacher-only, `security definer`).
  - Server Actions: `createStudent(input: { fullName: string; rollNo: number | null })` (mã tự sinh, `roll_no` mặc định = lớn nhất + 1); `updateStudent(input: { id: string; fullName: string; rollNo: number })`; `archiveStudent(id: string)` (đặt `archived_at = now()`, không xóa; nếu có tài khoản thì tài khoản bị chặn qua `getSessionUser`).
  - Chữ trạng thái hôm nay trên thẻ: `present` → `'Có mặt'` (`#DDF6F1/#0B5A4D`), `late` → `'Đi trễ'` (`#FFF1CC/#6E4700`), `absent_excused` → `'Vắng có phép'` (`#E3EEFF/#1F4C9E`), `absent_unexcused` → `'Vắng'` (`#FFE3EA/#8E1B3B`), chưa có dòng → `'Chưa điểm danh'` (`#F0EEFA/#4A476E`). Tỉ lệ chuyên cần = (present + late) / số ngày đã điểm danh, không có ngày nào → `'—'`.

- [ ] **Step 1: Viết test thất bại:**
  - `10_students_admin.test.sql`: `next_student_code` trả `'HS11'` khi có HS01–HS10; học sinh gọi → `not_allowed`.
  - `students.spec.ts`:
    - Tìm `dung` → chỉ thẻ "Phạm Đức Dũng"; tìm `zzz` → "Chưa tìm thấy phi hành gia nào" và "Cô thử đổi từ khóa hoặc bộ lọc nhé."
    - Sắp "Theo tên (A–Z)" → thẻ đầu "Nguyễn Minh Anh"; "Theo số sao" sau khi cộng 5 sao cho "Đỗ Anh Thư" (bằng RPC) → thẻ đầu "Đỗ Anh Thư".
    - Lọc "Đi trễ" khi chưa điểm danh → danh sách rỗng; thẻ hiện "Chưa điểm danh".
    - Mở hồ sơ "Võ Hà My" → "HỒ SƠ PHI HÀNH GIA", "Mã HS05 · Số thứ tự 5", 4 ô số liệu ("Sao thi đua tích lũy", "Sao khả dụng", "Thứ hạng cả năm", "Tỉ lệ chuyên cần" = "—"), "Lịch sử cộng/trừ sao" có dòng vừa cộng với nhãn ngày "Hôm nay"; "Đóng hồ sơ" đóng.
    - "+ Thêm học sinh" → nhập "Lý Thu Hà" → thẻ mới mã "HS11"; sửa tên thành "Lý Thu Hằng" → cập nhật; "Lưu trữ" → hộp xác nhận → thẻ biến mất, không còn trong Trạm thi đua; dòng DB vẫn còn với `archived_at` khác null.
    - Dọn: xóa học sinh test bằng service role.
- [ ] **Step 2:** `pnpm db:test && pnpm test:e2e tests/e2e/students.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo `Students.dc.html` (ô tìm, sắp xếp, lọc, nút "Tất cả học sinh"/"Chia tổ", lưới thẻ, panel hồ sơ có avatar với vương miện nếu hạng 1, huy hiệu từ `student_badges` — rỗng thì "Chưa có huy hiệu", lịch sử đổi quà từ `reward_requests` — rỗng thì "Chưa có lượt đổi quà"). `StudentForm` trong `Modal`. Nút "Nhập Excel / CSV" và "Xuất Excel" hiển thị nhưng nối ở Task 10; view "Chia tổ" nối ở Task 9 (tạm thời nút chuyển view vẫn đổi, khối chia tổ để trống).
- [ ] **Step 4:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm lint && pnpm test:e2e tests/e2e/students.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add students list, profile and CRUD`.

---

### Task 9: Chia tổ

**Files:**
- Create: `supabase/migrations/20261101000011_groups.sql`, `supabase/tests/11_groups.test.sql`, `app/(teacher)/hoc-sinh/GroupsView.tsx`
- Modify: `app/(teacher)/hoc-sinh/{StudentsClient.tsx,actions.ts}`, `app/(teacher)/thi-dua/StarsClient.tsx`, `lib/errors.ts`
- Test: `tests/e2e/students.spec.ts` (thêm describe "Chia tổ")

**Interfaces:**
- Produces (teacher-only, `security definer`, audit `groups.*`):
  - `public.set_group_role(p_student_id uuid, p_role public.group_role) returns void` — học sinh phải đang ở một tổ; đặt `leader`/`deputy` thì người đang giữ vai đó trong tổ trở thành `member` (cùng giao dịch); đặt `leader` cho người đang là `deputy` thì vai phó để trống (như thiết kế). Lỗi `not_in_group`.
  - `public.move_student_to_group(p_student_id uuid, p_group_id uuid) returns void` — chuyển (hoặc thêm nếu chưa có tổ) với vai `member`.
  - `public.create_group(p_name text) returns uuid` — `sort_order` = lớn nhất + 1; `public.delete_group(p_group_id uuid)` — chỉ khi tổ không còn thành viên, không thì `group_not_empty`.
  - `lib/errors.ts`: `not_in_group` → `'Học sinh này chưa ở tổ nào.'`, `group_not_empty` → `'Tổ còn thành viên, cô chuyển các bạn sang tổ khác trước nhé.'`
  - Server Actions: `setGroupRole(studentId, role)`, `moveStudent(studentId, groupId)`, `createGroup(name)`, `deleteGroup(groupId)`.

- [ ] **Step 1: Viết test thất bại:**
  - `11_groups.test.sql`: đặt HS02 làm leader Tổ 1 → HS01 thành member, chỉ 1 leader; đặt HS01 (deputy giả định) làm leader → tổ không còn deputy; chuyển HS03 sang Tổ 2 → vai member; `delete_group` tổ còn người → `group_not_empty`; học sinh gọi → `not_allowed`; tổ của lớp khác → `not_allowed`.
  - `students.spec.ts` "Chia tổ": thẻ "Tổ 1" có "3 bạn · N sao tích lũy"; "Đặt tổ trưởng" cho "Trần Gia Bảo" → nhãn "Tổ trưởng" chuyển sang bạn đó; "Chuyển sang" "Tổ 2" cho "Lê Khánh Chi" → Tổ 1 còn 2 bạn, Tổ 2 có 4; "Cộng sao cả tổ" → sang `/thi-dua?to=<groupId>` với cả tổ đã được chọn; thêm tổ "Tổ 5" → xuất hiện, xóa → biến mất. Khôi phục dữ liệu bằng `db reset` ở `beforeAll` của describe.
- [ ] **Step 2:** `pnpm db:test && pnpm test:e2e tests/e2e/students.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo khối chia tổ trong `Students.dc.html` (thẻ tổ, vai có màu `#FFC857`/`#E3EEFF`/trắng, nút "Đặt tổ trưởng", "Đặt tổ phó", ô chọn "Chuyển sang", nút "Cộng sao cả tổ"); thêm nút "+ Thêm tổ" và "Xóa tổ" (chỉ hiện khi tổ trống). Trạm thi đua đọc `?to=<groupId>` để chọn sẵn cả tổ (sửa nhỏ ở `StarsClient.tsx`).
- [ ] **Step 4:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test:e2e tests/e2e/students.spec.ts tests/e2e/stars.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add group management`.

---

### Task 10: Nhập và xuất danh sách học sinh

**Files:**
- Create: `lib/students/import.ts`, `lib/students/export.ts`, `app/(teacher)/hoc-sinh/ImportDialog.tsx`, `public/mau/mau-danh-sach-hoc-sinh.xlsx` (tạo bằng script từ `lib/students/export.ts`)
- Modify: `app/(teacher)/hoc-sinh/{StudentsClient.tsx,actions.ts}`
- Test: `tests/unit/student-import.test.ts`, `tests/e2e/students-import.spec.ts`

**Interfaces:**
- Produces:
  - Cột file mẫu (dòng tiêu đề): `Số thứ tự | Họ và tên | Mã học sinh` (mã để trống thì tự sinh).
  - `parseStudentSheet(data: ArrayBuffer, existingCodes: Set<string>): { rows: { line: number; rollNo: number | null; fullName: string; code: string | null; error: string | null }[] }` — nhận `.xlsx`, `.xls`, `.csv` (UTF-8, có hoặc không BOM); bỏ dòng hoàn toàn trống; lỗi: `'Thiếu họ và tên'`, `'Số thứ tự không hợp lệ'`, `'Mã đã có trong lớp'`, `'Mã bị trùng trong file'`; thiếu cột "Họ và tên" → ném `Error('missing_name_column')`.
  - `buildStudentWorkbook(rows: { code: string; rollNo: number; fullName: string; groupName: string; competition: number; available: number }[]): ArrayBuffer` — cột `Mã học sinh | Số thứ tự | Họ và tên | Tổ | Sao thi đua | Sao khả dụng`.
  - Server Action `importStudents(rows: { rollNo: number | null; fullName: string; code: string | null }[]): Promise<{ error?: string; created?: number }>` — chèn trong một RPC `public.import_students(p_rows jsonb) returns int` (teacher-only, sinh mã cho dòng thiếu, cả lô thất bại nếu một dòng lỗi) — thêm vào migration `…0010_students_admin.sql`.
  - `lib/errors.ts`: `missing_name_column` → `'File thiếu cột "Họ và tên". Cô tải file mẫu để xem cách điền nhé.'`

- [ ] **Step 1: Viết test thất bại:**
  - `student-import.test.ts`: CSV `"Số thứ tự,Họ và tên,Mã học sinh\n11,Lý Thu Hà,\n,,\n12,,HS20\nx,Mai Lan,HS01\n13,Tô Gia Huy,HS21\n14,Đào Minh,HS21"` với existing `{HS01…HS10}` → 5 dòng (dòng trống bị bỏ): dòng 2 hợp lệ, dòng 4 `'Thiếu họ và tên'`, dòng 5 `'Số thứ tự không hợp lệ'` (ưu tiên lỗi đầu tiên theo thứ tự: tên, số thứ tự, mã), dòng 6 hợp lệ, dòng 7 `'Mã bị trùng trong file'`; file có BOM đọc đúng "Số thứ tự"; file không có cột tên → ném `missing_name_column`. `buildStudentWorkbook` rồi đọc lại bằng `xlsx` → đúng tiêu đề và giá trị.
  - pgTAP thêm vào `10_students_admin.test.sql`: `import_students` 2 dòng → trả 2, mã tự sinh tiếp nối; một dòng mã trùng → cả lô lỗi `23505`, không dòng nào được thêm.
  - `students-import.spec.ts`: "Nhập Excel / CSV" → tải file CSV test (có 1 dòng lỗi) → bảng xem trước hiện dòng lỗi màu đỏ với lý do, nút "Thêm N học sinh" chỉ đếm dòng hợp lệ → bấm → thông báo `Đã thêm N học sinh.` → thẻ mới xuất hiện; "Xuất Excel" → tải về file `danh-sach-hoc-sinh-lop-5-8.xlsx` có 10 dòng dữ liệu. Dọn dữ liệu sau test.
- [ ] **Step 2:** `pnpm add xlsx` rồi `pnpm test && pnpm db:test && pnpm test:e2e tests/e2e/students-import.spec.ts` → FAIL.
- [ ] **Step 3:** Cài đặt. Đọc file ở client (`FileReader` → `ArrayBuffer`), giới hạn 2 MB và 500 dòng; bước xem trước trong `Modal`; chỉ gửi các dòng hợp lệ. Xuất file tạo ở Server Action trả base64, client tải về; tên file `danh-sach-hoc-sinh-<slug tên lớp>.xlsx` (slug: `normalizeVn`, khoảng trắng và `/` → `-`, bỏ ký tự khác `[a-z0-9-]`). Nút "Tải file mẫu" trong hộp nhập trỏ tới `/mau/mau-danh-sach-hoc-sinh.xlsx`.
- [ ] **Step 4:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm test:e2e tests/e2e/students-import.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add student import and export`.

---

### Task 11: Tổng quan (`/tong-quan`)

**Files:**
- Modify: `app/(teacher)/tong-quan/page.tsx`, `app/(teacher)/thi-dua/StarsClient.tsx`
- Create: `lib/overview/queries.ts`
- Test: `tests/unit/overview.test.ts`, `tests/e2e/overview.spec.ts`

**Interfaces:**
- Consumes: `getStudentsWithStars`, `getRecentBatches` (Task 6), `periodRange` (Task 4), `leaderboard_between`, `todayInVietnam`, `resolveAvatars`.
- Produces: `buildOverviewStats(input: { studentCount: number; attendanceToday: Record<'present'|'late'|'absent_excused'|'absent_unexcused', number>; weekAwarded: number; weekPenalized: number; redeemedCount: number; pendingRewards: number; starsOver100: number }): { label: string; value: string; sub: string }[]` — 6 thẻ theo `Main.dc.html`:
  1. `'Tổng số học sinh'`, `'<n>'`, `'đang học trong lớp'`.
  2. `'Có mặt hôm nay'`, `'<present+late>/<n>'`, `'<late> bạn đi trễ'`; nếu chưa có dòng điểm danh hôm nay: value `'—'`, sub `'Chưa điểm danh'`.
  3. `'Vắng hôm nay'`, `'<absent_excused+absent_unexcused>'`, sub `'vắng có phép'` nếu chỉ có phép, `'vắng không phép'` nếu chỉ không phép, `'<x> có phép, <y> không phép'` nếu cả hai; chưa điểm danh: `'—'`, `'Chưa điểm danh'`.
  4. `'Sao thi đua tuần này'`, `'+<weekAwarded>'`, `'đã trừ <weekPenalized> sao'`.
  5. `'Lượt đổi quà'`, `'<redeemedCount>'`, `'<pendingRewards> yêu cầu chờ duyệt'`.
  6. `'Học sinh nổi bật'`, `'<starsOver100>'`, `'đạt mốc 100 sao'`.

- [ ] **Step 1: Viết test thất bại:** `overview.test.ts` cho cả 6 thẻ và các nhánh chưa điểm danh/vắng. `overview.spec.ts`: chào "Xin chào, cô Khanh!" (tên từ `classes.teacher_name`, bỏ chữ "Cô " ở đầu rồi ghép "cô "); "Bắt đầu điểm danh" dẫn `/diem-danh`, "Cộng sao cho lớp" dẫn `/thi-dua`; sau khi cộng 2 sao cho "Nguyễn Minh Anh" (RPC) → "Top 3 phi hành gia xuất sắc" có tên đó hạng 1, "Hoạt động gần đây" có dòng `+2` `Nguyễn Minh Anh – <lý do>` với meta `Cô Khanh · Vừa xong`; "Tín hiệu từ trạm chỉ huy" rỗng → "Chưa có thông báo nào."; ảnh bìa: không có `cover_path` → khối chào dùng hình vẽ sẵn như thiết kế.
- [ ] **Step 2:** `pnpm test && pnpm test:e2e tests/e2e/overview.spec.ts` → FAIL.
- [ ] **Step 3:** Giao diện theo `Main.dc.html` (khối chào gradient, 6 thẻ số liệu với icon và màu của thiết kế, Top 3 thứ tự 2–1–3 theo sao thi đua cả năm, "Thao tác nhanh" 5 nút với `href` → `/diem-danh`, `/thi-dua`, `/thi-dua?che-do=tru`, `/doi-qua`, `/xep-hang`, "Hoạt động gần đây" 5 mục mới nhất gồm batch sao và yêu cầu đổi quà `pending` ("<tên> gửi yêu cầu đổi <quà>", meta "Chờ duyệt · <giờ tương đối>"), "Tín hiệu từ trạm chỉ huy" 3 thông báo chưa lưu trữ, ghim trước, mới trước, link "Xem tất cả" → `/thong-bao`). Trạm thi đua đọc `?che-do=tru` để mở sẵn chế độ trừ.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm test:e2e tests/e2e/overview.spec.ts` → PASS.
- [ ] **Step 5:** Commit `feat: add overview dashboard`.

---

### Task 12: Kiểm tra cuối đợt

- [ ] **Step 1:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm build && pnpm test:e2e` → tất cả PASS.
- [ ] **Step 2:** So ảnh chụp `test-results/stars-*.png` và ảnh `/hoc-sinh`, `/xep-hang`, `/tong-quan` ở ba cỡ với bản vẽ; ghi khác biệt vào `docs/superpowers/plans/2026-10-31-dot-2-ghi-chu.md`.
- [ ] **Step 3:** Commit `chore: phase 2 verification notes`.
