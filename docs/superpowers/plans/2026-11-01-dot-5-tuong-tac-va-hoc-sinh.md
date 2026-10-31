# Đợt 5: Tương tác và trang học sinh – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chạy thật Nhiệm vụ và huy hiệu, Gọi tên ngẫu nhiên, Chế độ trình chiếu và toàn bộ cổng học sinh `/em` (7 trang), sau khi đóng các lỗ quyền mà đợt 3–4 chuyển sang.

**Architecture:** Học sinh chỉ đọc qua RLS hoặc hàm `security definer` trả cột công khai; mọi ghi của học sinh chỉ qua `request_reward` và `set_my_avatar`. Trang học sinh dùng layout `/em` riêng (menu học sinh theo `Student.dc.html`), mỗi trang bị ẩn khỏi menu và trả 404 khi cờ tương ứng tắt.

**Tech Stack:** như đợt 4.

**Spec:** `docs/superpowers/specs/2026-10-31-tram-khong-gian-nam-8-design.md` (4.3 cờ, 4.4 RLS, 5 Missions/Random/Display/Student). Bản vẽ: `design/project/{Missions,Random,Display,Student}.dc.html`. Việc chuyển tiếp: `docs/superpowers/plans/2026-11-01-dot-3-viec-chuyen-tiep.md` và `…-dot-4-viec-chuyen-tiep.md` (mục Đợt 5).

## Global Constraints

- Mọi Global Constraints của đợt 1–4 vẫn áp dụng. Thứ tự khóa: học sinh (`FOR NO KEY UPDATE`) → quà → yêu cầu; nhóm → thành viên nhóm.
- Migration tiếp theo: `20261101000015_student_access.sql`, `…0016_missions.sql`.
- Học sinh không bao giờ thấy: lý do trừ sao, dữ liệu của bạn khác ngoài tên + avatar + sao thi đua trên bảng xếp hạng, ảnh của thông báo đã xóa hoặc quà đã ẩn, nút quản trị (HANDOFF §5).
- Trang `/trinh-chieu` không hiện tài khoản, điểm danh, lý do trừ sao, nút quản trị (HANDOFF §5).
- Cờ trong `class_settings`: `feature_missions`, `feature_random`, `feature_display`, `feature_rewards`, `student_can_view_profile`, `student_can_view_history`, `student_can_view_rank`, `student_can_view_rewards`, `student_can_view_timetable`, `student_can_view_news`, `student_can_view_attendance`, `student_can_change_avatar`. Trang giáo viên của tính năng đang tắt hiện thông báo `'Tính năng này đang tắt. Cô bật lại trong Cài đặt.'` (không ẩn khỏi menu giáo viên).
- Thứ Bảy hiện ở mọi lưới thời khóa biểu chỉ khi `timetable_saturday` bật.
- Chữ hiển thị chép từ thiết kế, bỏ mọi câu "bản thiết kế / chưa lưu thật".

## Review Focus

1. Học sinh A gọi thẳng API đọc `reward_requests`, `student_badges`, `mission_completions`, `attendance` của B → 0 dòng. Test ở Task 1 và Task 2.
2. Học sinh đổi quà khi bạn khác vừa giữ món cuối → trang hiện "Hết quà" sau khi tải lại, RPC trả `out_of_stock` và trang hiện câu lỗi tiếng Việt, không lỗi trang. Test ở Task 6.
3. Cô tắt cờ xem một trang khi học sinh đang mở trang đó → lần tải sau trả 404, mục biến khỏi menu. Test ở Task 5.
4. Ghi nhận hoàn thành nhiệm vụ hai lần cho cùng bạn trong cùng kỳ → lần sau báo `already_completed`, không cộng sao hai lần. Test ở Task 2.
5. Trình chiếu để mở qua ngày → "Hôm nay học gì?" đổi theo ngày Việt Nam khi trang tự làm mới (mỗi 5 phút). Test ở Task 4 (unit cho hàm chọn ngày).

---

### Task 1: Đóng lỗ quyền và hàm đọc cho học sinh (DB)

**Files:**
- Create: `supabase/migrations/20261101000015_student_access.sql`, `supabase/tests/15_student_access.test.sql`
- Modify: `lib/errors.ts`, tests

**Interfaces:**
- Storage: thay `class_media_select` bằng policy: giáo viên đọc mọi file dưới `<lớp>/`; người khác cùng lớp đọc `avatars/*` và `logo/*`, `cover/*`; `announcements/*` chỉ khi tồn tại `announcements` (theo RLS người gọi) có `image_path = name`; `rewards/*` chỉ khi tồn tại `rewards` không ẩn có `image_path = name`.
- `public.reward_availability() returns table (reward_id uuid, name text, cost int, description text, icon text, image_path text, left_count int)` — `stable security definer`; lớp người gọi; chỉ quà không ẩn; `left_count = greatest(stock − pending, 0)`; chạy khi giáo viên hoặc (`feature_rewards` và `student_can_view_rewards`) bật, không thì rỗng.
- `public.my_reward_requests() returns table (id uuid, reward_name text, cost int, status reward_request_status, created_at timestamptz)` — học sinh gọi: yêu cầu của chính em, tên quà lấy kể cả khi quà đã ẩn.
- `public.leaderboard_for_period(p_period text) returns table (… như leaderboard_between …)` — `p_period ∈ week|month|term|year`, tính mốc trong SQL theo giờ Việt Nam và ngày học kỳ của lớp (cùng quy tắc `resolvePeriod`: học kỳ 2 nếu đã tới `term2_start`, học kỳ 1 nếu có ngày, không thì cả năm). `leaderboard_between` thêm kiểm `private.is_teacher()` (học sinh gọi → `not_allowed`).
- `public.my_profile_summary() returns table (student_id uuid, full_name text, avatar_id uuid, competition_stars int, available_stars int, rank_year int, class_size int)` — học sinh; `rank_year` chỉ khi `student_can_view_rank` bật, không thì null.

- [ ] **Step 1: Viết test thất bại:** học sinh không `select` được object ảnh của thông báo đã lưu trữ / quà ẩn / khi tắt `student_can_view_news`, vẫn đọc được ảnh thông báo đang hiện và avatar; giáo viên đọc được hết; `reward_availability` trả `left_count` đúng khi bạn khác đang giữ (đã kiểm ở review đợt 3: B thấy "Còn 1" sai); `my_reward_requests` trả tên quà đã ẩn và không trả yêu cầu của bạn khác; `leaderboard_for_period('week')` khớp `leaderboard_between` với mốc tuần; học sinh gọi `leaderboard_between` → `not_allowed`; `my_profile_summary` đúng số và `rank_year` null khi tắt cờ; anon không EXECUTE hàm nào.
- [ ] **Step 2:** `pnpm db:test` → FAIL. **Step 3:** viết migration. **Step 4:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test` → PASS (trang giáo viên đang gọi `leaderboard_between` vẫn chạy). **Step 5:** commit `feat(db): close student read gaps and add student read functions`.

---

### Task 2: Nhiệm vụ và huy hiệu (DB + trang `/nhiem-vu`)

**Files:**
- Create: `supabase/migrations/20261101000016_missions.sql`, `supabase/tests/16_missions.test.sql`, `app/(teacher)/nhiem-vu/{page.tsx,MissionsClient.tsx,actions.ts}`, `lib/missions/queries.ts`, `lib/missions/period.ts`
- Modify: `supabase/seed.sql` (5 nhiệm vụ và 4 huy hiệu mẫu theo `Missions.dc.html`, `is_demo`)
- Test: `tests/unit/mission-period.test.ts`, `tests/e2e/missions.spec.ts`

**Interfaces:**
- Enum `mission_period` thêm `day`, `term` (nhãn: `day` "Hôm nay", `week` "Tuần này", `month` "Tháng này", `term` "Học kỳ").
- `private.mission_period_key(p_period mission_period, p_at timestamptz, p_class uuid) returns text` — `day`: `YYYY-MM-DD` Việt Nam; `week`: `YYYY-Www` theo thứ Hai Việt Nam; `month`: `YYYY-MM`; `term`: `T1`/`T2` + năm học. Bản TypeScript `missionPeriodKey(...)` trong `lib/missions/period.ts` cho hiển thị, unit test khớp SQL ở các mốc.
- `public.complete_mission(p_mission_id uuid, p_student_id uuid) returns void` — teacher; nhiệm vụ đang `active`, cùng lớp; học sinh đang học; trùng `(mission, student, period_key)` → `already_completed`; nếu `reward_stars > 0` ghi cộng sao qua `private.change_stars` với note `'Nhiệm vụ: <tên>'` và lưu `star_transaction_id`. Audit `missions.complete`.
- `public.award_badge(p_badge_id uuid, p_student_id uuid) returns void` — teacher; trùng → `already_awarded`; không cộng sao. Audit `badges.award`.
- `lib/errors.ts`: `already_completed` → `'Bạn này đã hoàn thành nhiệm vụ trong kỳ này.'`; `already_awarded` → `'Bạn này đã có huy hiệu này.'`; `mission_required` → `'Cô hãy nhập tên và điều kiện hoàn thành.'`.
- Server Actions: `saveMission({ id?, name, period, condition, rewardStars })`, `toggleMission(id)`, `completeMission(missionId, studentId)`, `awardBadge(badgeId, studentId)`, `setFeatureMissions(on)` (công tắc "Tính năng nhiệm vụ" ghi `class_settings.feature_missions`).

- [ ] **Step 1: Viết test thất bại:** pgTAP cho hai hàm (thành công, trùng kỳ, sang kỳ mới được ghi lại, nhiệm vụ tạm dừng → `not_allowed`, học sinh gọi → `not_allowed`, sao cộng đúng và có `star_transaction_id`, huy hiệu không cộng sao); học sinh chỉ đọc `mission_completions`/`student_badges` của mình. Unit `missionPeriodKey` (thứ Bảy 23:30 VN và thứ Hai 00:10 VN khác tuần). e2e: công tắc "Tính năng nhiệm vụ" có "Đang bật/Đang tắt"; tạo nhiệm vụ thiếu điều kiện → câu lỗi; tạo "Đọc sách" "Tuần này" 2 sao → `'Đã thêm nhiệm vụ mới.'`; chọn "Võ Hà My" → "Ghi nhận thêm 1 bạn" → "1/10 bạn đã hoàn thành", Hà My +2 sao thi đua; ghi lần nữa → câu `already_completed`; "Tạm dừng" → mờ, nút "Mở lại"; "Trao huy hiệu" → `'Đã trao "<huy hiệu>" cho Võ Hà My. Huy hiệu không tự cộng sao.'`, số "bạn đã đạt" tăng; trao lần nữa → `already_awarded`. Mẫu số "/10" là số học sinh đang học.
- [ ] **Step 2–4:** FAIL → cài đặt theo `Missions.dc.html` → `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/missions.spec.ts` PASS; ảnh `test-results/missions-desktop.png`.
- [ ] **Step 5:** commit `feat: add missions and badges`.

---

### Task 3: Gọi tên ngẫu nhiên (`/goi-ten`)

**Files:**
- Create: `app/(teacher)/goi-ten/{page.tsx,RandomClient.tsx,actions.ts}`, `lib/random/pick.ts`
- Test: `tests/unit/random-pick.test.ts`, `tests/e2e/random.spec.ts`

**Interfaces:**
- `buildPool(students: {id; groupId; presentToday: boolean}[], opts: { scope: 'all' | groupId; onlyPresent: boolean }): string[]`; `pickNext(pool: string[], called: string[], noRepeat: boolean, rand: () => number): string | null`.
- Server Action `rewardRandom(studentId)` gọi `award_stars([id], 1, null, 'Gọi tên ngẫu nhiên')`.
- Trạng thái vòng (đã gọi) giữ ở `sessionStorage` theo ngày (bắt trong try/catch), mất khi sang ngày mới.

- [ ] **Step 1:** unit: lọc theo tổ, bỏ bạn vắng khi `onlyPresent`, "chưa điểm danh" tính là có mặt (cô chưa điểm danh thì không loại ai), `noRepeat` loại bạn đã gọi, hết người → null. e2e: phạm vi "Cả lớp"/"Tổ 1…"; hai công tắc theo thiết kế; "Quay số" → sau khi dừng hiện "PHI HÀNH GIA MAY MẮN", tên, "Tổ N · Mã HSxx"; "+1 sao cho bạn này" → `'Đã cộng 1 sao cho <tên>.'` và DB có giao dịch; danh sách "Đã được gọi (1/10)"; gọi hết → `'Cả nhóm đã được gọi hết. Cô bấm "Bắt đầu vòng mới" nhé.'`; "Bắt đầu vòng mới" xóa danh sách; `feature_random` tắt → thông báo tính năng đang tắt. Animation tôn trọng `prefers-reduced-motion` (dừng ngay).
- [ ] **Step 2–4:** FAIL → cài đặt theo `Random.dc.html` → `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/random.spec.ts` PASS; ảnh `test-results/random-desktop.png`.
- [ ] **Step 5:** commit `feat: add random name picker`.

---

### Task 4: Chế độ trình chiếu (`/trinh-chieu`)

**Files:**
- Modify: `app/trinh-chieu/page.tsx`
- Create: `app/trinh-chieu/DisplayClient.tsx`, `lib/display/queries.ts`
- Test: `tests/unit/display.test.ts`, `tests/e2e/display.spec.ts`

**Interfaces:**
- `getDisplayData(classId, now)` → `{ cls; dateLabel; top5 (leaderboard cả năm, sao > 0 mới có vương miện); weekTop3 (sao thi đua tuần, `+n`); highlight: string; today: { label; subject; bg; ink }[] (thứ hôm nay theo `weekdayInVietnam`, tôn trọng thứ Bảy; Chủ nhật → rỗng); pinned: announcement | null }`.
- `buildHighlight(weekTotal: number, leadingGroup: string | null): string` → `'Cả lớp đạt <n> sao thi đua trong tuần. <Tổ> dẫn đầu.'` (bỏ câu sau nếu không có tổ nào > 0).
- Tự làm mới dữ liệu mỗi 5 phút (`router.refresh()`); nút "Tự động chuyển khối" bật/tắt (mặc định tắt) — khi bật, mỗi 15 giây nhấn mạnh lần lượt từng khối (Top 5, Sao tuần, Thành tích, Hôm nay học gì, Thông báo) bằng viền sáng + cuộn khối vào giữa; tôn trọng `prefers-reduced-motion`.
- Trang chỉ cho giáo viên (layout hiện tại đã chặn học sinh); `feature_display` tắt → thông báo tính năng đang tắt.

- [ ] **Step 1:** unit `buildHighlight` và chọn ngày (Chủ nhật, thứ Bảy tắt/bật). e2e: có "TRẠM KHÔNG GIAN NĂM 8", ngày, năm học; Top 5 đúng thứ tự sau khi seed sao; không có chữ "Điểm danh", "Đăng xuất", tên đăng nhập, lý do trừ sao (seed một lần trừ có ghi chú "Nói chuyện riêng" → không xuất hiện); "Thoát trình chiếu" về `/tong-quan`; bật tự động chuyển khối → khối thứ hai được tô sau ~15 giây (dùng `page.clock`).
- [ ] **Step 2–4:** FAIL → cài đặt theo `Display.dc.html` (nền navy, khổ 16:9 co giãn) → `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/display.spec.ts` PASS; ảnh `test-results/display-desktop.png` ở 1600×900.
- [ ] **Step 5:** commit `feat: add classroom display mode`.

---

### Task 5: Cổng học sinh – khung, Trang chủ, Sao của em, Bảng xếp hạng

**Files:**
- Modify: `app/em/layout.tsx`, `app/em/page.tsx`
- Create: `components/layout/StudentNav.tsx`, `lib/student/flags.ts`, `lib/student/queries.ts`, `app/em/{sao,xep-hang}/page.tsx`, `app/em/AvatarPicker.tsx`, `app/em/actions.ts`
- Test: `tests/unit/student-flags.test.ts`, `tests/e2e/student-portal.spec.ts`

**Interfaces:**
- `STUDENT_NAV` 7 mục đúng thứ tự, nhãn và path SVG trong `Student.dc.html` (`home` `/em`, `stars` `/em/sao`, `rank` `/em/xep-hang`, `gifts` `/em/doi-qua`, `tt` `/em/thoi-khoa-bieu`, `att` `/em/diem-danh`, `news` `/em/thong-bao`); tiêu đề theo `TITLES` của thiết kế.
- `visibleStudentPages(settings): Set<pageId>` — `home` luôn hiện; `stars` cần `student_can_view_history`; `rank` cần `student_can_view_rank`; `gifts` cần `feature_rewards` và `student_can_view_rewards`; `tt` cần `student_can_view_timetable`; `att` cần `student_can_view_attendance`; `news` cần `student_can_view_news`. Trang ẩn → `notFound()`.
- Header học sinh theo thiết kế (tên trang, "Lớp <tên lớp> · <ngày>", avatar, tên, "Học sinh", "Đăng xuất" = form POST `signOut`). Giáo viên xem `/em` (xem thử) thấy dòng "Cô đang xem thử giao diện học sinh." và dữ liệu của học sinh đầu tiên — giữ hành vi đợt 1.
- Trang chủ theo khối `isHome` của thiết kế: lời chào `'Xin chào, <tên gọi>!'`, `'Hôm nay em còn <n> sao khả dụng. Cố gắng thêm nhé, phi hành gia nhí!'`, 3 ô số (`stats`), "Hôm nay học gì?" (5 tiết sáng của hôm nay; rỗng ngày nghỉ: `'Hôm nay em được nghỉ.'`), "Tín hiệu mới" (3 thông báo, ẩn khối nếu cờ tin tắt).
- Đổi avatar: khi `student_can_change_avatar` bật, bấm avatar ở trang chủ mở `Modal` thư viện (không ẩn), "Lưu avatar" gọi `set_my_avatar`. Thiết kế không có — ghi lại quyết định.
- Sao của em: "Lịch sử sao của em" từ `v_my_star_history` (nhãn trừ sao là "Trừ sao"), dòng "Em chỉ thấy lịch sử của riêng mình, không thấy của bạn khác.", "Huy hiệu của em" (đã đạt + chưa đạt mờ với "(chưa đạt)").
- Bảng xếp hạng: `leaderboard_for_period('year')`, "Top 5 ngôi sao sáng nhất · cả năm", dòng của em tô `#EEF0FF` viền `#4F5BD5` và "(em)"; nếu em ngoài Top 5 thì thêm dòng của em ở cuối.

- [ ] **Step 1:** unit `visibleStudentPages` mọi cờ. e2e (đăng nhập `hs.hamy`): menu 7 mục khi bật hết; tắt `student_can_view_rank` → mục biến mất và `/em/xep-hang` 404; Trang chủ đúng số sao khả dụng sau khi seed; lịch sử có "Trừ sao" nhưng không có ghi chú trừ sao đã seed; bảng xếp hạng có "(em)"; đổi avatar khi cờ bật, không thấy nút khi cờ tắt; "Đăng xuất" về `/dang-nhap`; học sinh mở `/tong-quan` → về `/em`.
- [ ] **Step 2–4:** FAIL → cài đặt → `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/student-portal.spec.ts` PASS; ảnh `test-results/student-home-{mobile,desktop}.png`.
- [ ] **Step 5:** commit `feat: student portal shell, home, stars and rank`.

---

### Task 6: Cổng học sinh – Đổi quà, Thời khóa biểu, Điểm danh, Thông báo

**Files:**
- Create: `app/em/{doi-qua,thoi-khoa-bieu,diem-danh,thong-bao}/page.tsx`, `app/em/doi-qua/GiftsClient.tsx`, `app/em/doi-qua/actions.ts`
- Modify: `app/(teacher)/tong-quan/page.tsx` (dùng `announcementColors`, bỏ `NEWS_COLOR`)
- Test: `tests/e2e/student-pages.spec.ts`, `tests/e2e/announcements.spec.ts` (thêm thay ảnh, "Bỏ hình", `announcement_not_found`)

**Interfaces:**
- Đổi quà: dữ liệu từ `reward_availability()` và `my_reward_requests()`; nút theo thiết kế: `'Hết quà'` (left 0), `'Chưa đủ sao (thiếu <n>)'`, `'Đổi quà'`; hộp xác nhận `'Em muốn đổi "<quà>" với <giá> sao?'` "Hủy"/"Gửi yêu cầu"; Server Action `requestReward(rewardId)` (requireStudent + zod) gọi `request_reward`; câu thành công `'Đã gửi yêu cầu đổi "<quà>". Hệ thống giữ <giá> sao cho em, chờ cô duyệt.'` (khi `reserve_on_request` tắt bỏ vế giữ sao); lỗi qua `toVietnameseMessage`. "Yêu cầu đổi quà của em" dùng nhãn `STAT` (đổi `pending` thành `'Chờ cô duyệt'` như thiết kế học sinh).
- Thời khóa biểu: lưới đọc (không sửa), đúng màu môn, cột hôm nay tô `#4F5BD5`, thứ Bảy theo cờ.
- Điểm danh của em: 4 ô (`'Tỉ lệ chuyên cần'`, `'Số buổi vắng'`, `'Số buổi đi trễ'`, `'Vắng có phép'`) dùng quy tắc `attended`; danh sách ngày gần nhất; dòng `'Trang này chỉ hiện khi cô Khanh bật quyền xem'` đổi thành `'Trang này chỉ hiện khi cô giáo bật quyền xem.'` (tên giáo viên không viết cứng).
- Thông báo: danh sách không lưu trữ, ghim trước, có ảnh (URL ký), màu theo `announcementColors`.

- [ ] **Step 1:** e2e: Hà My đủ sao đổi quà → câu thành công, yêu cầu "Chờ cô duyệt"; bạn khác giữ món cuối → Hà My thấy "Hết quà"; gọi thẳng RPC khi hết → câu `out_of_stock` hiện trên trang (Review Focus 2); không đủ sao → nút "Chưa đủ sao (thiếu n)" bị khóa; thời khóa biểu hiện môn đã gán; điểm danh 4 ô đúng sau khi seed; tắt `student_can_view_attendance` → 404; thông báo đã xóa không hiện và ảnh của nó trả 400/403 khi lấy URL ký; thêm 3 test thông báo còn thiếu của đợt 4.
- [ ] **Step 2–4:** FAIL → cài đặt → `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/student-pages.spec.ts tests/e2e/announcements.spec.ts tests/e2e/overview.spec.ts` PASS; ảnh `test-results/student-gifts-desktop.png`.
- [ ] **Step 5:** commit `feat: student gifts, timetable, attendance and news`.

---

### Task 7: Kiểm tra cuối đợt

- [ ] **Step 1:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm build && pnpm test:e2e && bash scripts/db/reward-race.sh` → PASS.
- [ ] **Step 2:** So ảnh với thiết kế; ghi `docs/superpowers/plans/2026-11-01-dot-5-ghi-chu.md`.
- [ ] **Step 3:** Commit `chore: phase 5 verification notes`.
