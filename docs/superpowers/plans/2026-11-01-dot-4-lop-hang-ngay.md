# Đợt 4: Lớp học hằng ngày – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ba trang giáo viên chạy thật: Điểm danh (lưu theo ngày, sửa ngày trước, lịch tháng, xuất CSV), Thời khóa biểu (lưới tiết, môn học sửa được, in/xuất Excel) và Thông báo (đăng, sửa, ghim, xóa mềm, đính kèm ảnh).

**Architecture:** Điểm danh lưu qua một RPC `save_attendance` (upsert cả ngày trong một giao dịch). Thời khóa biểu và thông báo ghi qua RLS của giáo viên bằng Server Action; ràng buộc nghiệp vụ (môn đang dùng không xóa được, tên môn không trùng) đặt ở cơ sở dữ liệu.

**Tech Stack:** như đợt 3.

**Spec:** `docs/superpowers/specs/2026-10-31-tram-khong-gian-nam-8-design.md` (mục 4, 5 các dòng Attendance/Timetable/Announcements). Bản vẽ: `design/project/{Attendance,Timetable,Announcements}.dc.html`. Việc chuyển tiếp: `docs/superpowers/plans/2026-11-01-dot-3-viec-chuyen-tiep.md`.

## Global Constraints

- Mọi Global Constraints của đợt 1–3 vẫn áp dụng.
- Không khóa `students` bằng `FOR UPDATE` trong bất kỳ hàm mới nào (FK insert vào `attendance` lấy `FOR KEY SHARE`). `save_attendance` không cần khóa học sinh.
- Migration tiếp theo: `20261101000014_daily.sql`.
- HANDOFF §4: "Không tự đánh dấu có mặt khi cô chưa lưu" — nút "Tất cả có mặt" chỉ điền trên màn hình; không có gì ghi xuống cho tới khi bấm "Lưu điểm danh".
- Ngày dùng giờ Việt Nam (`todayInVietnam`). Không cho lưu điểm danh cho ngày trong tương lai.
- Chữ hiển thị chép từ thiết kế, bỏ câu "Đây là bản thiết kế…" / "…chưa lưu vào cơ sở dữ liệu thật".
- Màu môn học: bảng `PAL` 11 cặp `[nền, chữ]` trong `Timetable.dc.html`; `subjects.color` lưu màu chữ (ô thứ hai), nền tra từ bảng.

## Review Focus

1. Cô lưu điểm danh hai lần cho cùng ngày (hoặc sửa một ngày cũ) → mỗi học sinh vẫn chỉ có một dòng cho ngày đó, số liệu "Tổng kết hôm nay" và Tổng quan khớp. Test ở Task 1 và Task 2.
2. Cô bỏ chọn trạng thái của một bạn rồi lưu → dòng của bạn đó bị xóa (trở về "Chưa điểm danh"), không lưu "có mặt" ngầm. Test ở Task 1 và Task 2.
3. Đổi tên một môn đang dùng → mọi ô của môn đó đổi tên theo (vì ô trỏ tới id), xóa môn đang dùng → bị chặn với câu của thiết kế. Test ở Task 1 và Task 3.
4. Thông báo bị xóa (lưu trữ) không còn hiện ở Tổng quan và (sau này) trang học sinh, nhưng dòng vẫn còn trong cơ sở dữ liệu. Test ở Task 4.
5. Điểm danh cho học sinh đã lưu trữ hoặc của lớp khác qua RPC → `student_not_found`, không ghi gì. Test ở Task 1.

---

### Task 1: Cơ sở dữ liệu cho điểm danh, môn học, thời khóa biểu

**Files:**
- Create: `supabase/migrations/20261101000014_daily.sql`, `supabase/tests/14_daily.test.sql`
- Modify: `lib/errors.ts`, `tests/unit/errors.test.ts`

**Interfaces:**
- Produces:
  - `public.save_attendance(p_date date, p_rows jsonb) returns int` — teacher-only, `security definer`, `search_path = ''`, grant `authenticated`. `p_rows` là mảng `{student_id, status}` với `status` ∈ `present|absent_unexcused|absent_excused|late|null`. `null` = xóa dòng ngày đó của học sinh. Mọi `student_id` phải thuộc lớp và chưa lưu trữ (`student_not_found`); `p_date > todayInVietnam` → `future_date`; trùng `student_id` trong mảng → `invalid_rows`; > 100 phần tử → `invalid_rows`. Upsert theo `(student_id, date)`. Trả số dòng đã ghi/xóa. Audit `attendance.save` với `{date, count}`.
  - FK `timetable_slots (class_id, subject_id) → subjects` đổi sang `on delete restrict` (migration ALTER: drop và tạo lại constraint). Xóa môn đang dùng → lỗi 23503, map ở app thành `subject_in_use`.
  - Unique index `subjects (class_id, lower(name))`.
  - Cột `class_settings.timetable_saturday boolean not null default false` (bật ở Cài đặt, đợt 6).
  - `lib/errors.ts`: `future_date` → `'Chưa thể điểm danh cho ngày trong tương lai.'`; `subject_in_use` → `'Môn này đang có trong thời khóa biểu. Cô hãy đổi các tiết đó sang môn khác trước khi xóa.'` (app ghép tên môn như thiết kế); `subject_exists` → `'Môn này đã có trong danh sách.'`; `subject_name_required` → `'Cô hãy nhập tên môn học.'`; `announcement_required` → `'Cô hãy nhập tiêu đề và nội dung.'`.

- [ ] **Step 1: Viết test thất bại** `14_daily.test.sql`: lưu 3 bạn ngày D → 3 dòng; lưu lại ngày D với 1 bạn đổi trạng thái và 1 bạn `null` → còn 2 dòng, trạng thái mới; ngày mai → `future_date`; học sinh lưu trữ, lớp khác → `student_not_found`; trùng id → `invalid_rows`; học sinh gọi → `not_allowed`; anon không EXECUTE; audit có `class_id`. Xóa môn đang dùng → `throws_ok(…, '23503')`; xóa môn không dùng → `lives_ok`; thêm môn trùng tên khác hoa thường → `23505`; cột `timetable_saturday` mặc định false.
- [ ] **Step 2:** `pnpm db:test` → FAIL.
- [ ] **Step 3:** Viết migration.
- [ ] **Step 4:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(db): attendance save, subject constraints`.

---

### Task 2: Trang Điểm danh (`/diem-danh`)

**Files:**
- Create: `app/(teacher)/diem-danh/{page.tsx,AttendanceClient.tsx,MonthCalendar.tsx,actions.ts}`, `lib/attendance/queries.ts`, `lib/attendance/csv.ts`
- Test: `tests/unit/attendance-csv.test.ts`, `tests/e2e/attendance.spec.ts`

**Interfaces:**
- Consumes: `save_attendance` (Task 1), `todayInVietnam`, `formatVietnameseDate`, `getStudentsWithStars` (danh sách học sinh đang học, sắp `roll_no`), `Modal`, `Notice`.
- Produces:
  - `lib/attendance/queries.ts`: `getDay(classId, date): Promise<Record<studentId, Status>>`; `getRecentDays(classId, limit = 5)` → `{ date; present; absent; excused; late }[]` (chỉ ngày có ít nhất một dòng, mới trước); `getMonth(classId, month: 'YYYY-MM')` → `{ date; counts }[]` và dòng theo học sinh.
  - `lib/attendance/csv.ts`: `buildMonthCsv(students: {code; fullName}[], days: string[], cells: Record<string, Record<string, Status>>): string` — UTF-8 có BOM, cột `Mã học sinh, Họ và tên, <dd/mm>…, Có mặt, Vắng không phép, Vắng có phép, Đi trễ`; ô dùng ký hiệu `C` có mặt, `K` vắng không phép, `P` vắng có phép, `T` đi trễ, trống nếu chưa điểm danh.
  - Server Actions: `saveAttendance(date, rows)` (requireTeacher + zod), `exportMonthCsv(month)` (trả chuỗi; client tải `diem-danh-<lop>-<YYYY-MM>.csv`).
  - URL: `?ngay=YYYY-MM-DD` chọn ngày (mặc định hôm nay), `?thang=YYYY-MM` cho lịch.

- [ ] **Step 1: Viết test thất bại:** unit `buildMonthCsv` (BOM, tiêu đề, ký hiệu, tổng từng cột trạng thái). e2e: mặc định ngày hôm nay hiện "Ngày điểm danh" + ngày đầy đủ; mọi bạn "Chưa điểm danh"; "Tất cả có mặt" → mọi thẻ "Có mặt" nhưng DB chưa có dòng; "Lưu điểm danh" → thông báo, DB có 10 dòng `present`; đổi 1 bạn sang "Đi trễ", 1 bạn bỏ chọn → lưu → DB 9 dòng, "Tổng kết hôm nay" đúng; "Lịch sử điểm danh theo ngày" có dòng hôm nay với đúng số; "Chỉnh sửa" một ngày cũ (seed bằng SQL) → URL `?ngay=` ngày đó, sửa và lưu được; chọn ngày mai → nút lưu báo `future_date`; lịch tháng hiện số ngày đã điểm danh, bấm ngày → mở ngày đó; "Xuất CSV" tải file có tiêu đề đúng. Dọn dữ liệu (`resetAttendance`).
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Giao diện theo `Attendance.dc.html`: khối chọn ngày ("Chọn ngày" mở `<input type="date">` có `max` = hôm nay), "Tất cả có mặt", "Bỏ chọn hết", "Lưu điểm danh"; thẻ học sinh với 4 nút trạng thái (màu theo `OPT`), vòng màu quanh avatar, chữ trạng thái; khối "Tổng kết hôm nay" 6 ô (màu theo thiết kế); "Lịch sử điểm danh theo ngày" + "Cô có thể chỉnh lại các ngày trước" + "Chỉnh sửa". Thêm (spec, thiết kế chưa có) khối "Lịch tháng" dạng lưới 7 cột thứ Hai → Chủ nhật, mỗi ô ngày có số có mặt/tổng, nút tháng trước/sau, nút "Xuất CSV". Câu lưu thành công: `'Đã lưu điểm danh ngày <dd/mm/yyyy>.'`. Có thay đổi chưa lưu mà rời trang → cảnh báo `beforeunload`.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/attendance.spec.ts tests/e2e/overview.spec.ts tests/e2e/students.spec.ts` → PASS (Tổng quan và thẻ học sinh đọc cùng dữ liệu).
- [ ] **Step 5:** Ảnh chụp `test-results/attendance-desktop.png`; commit `feat: add attendance page`.

---

### Task 3: Trang Thời khóa biểu (`/thoi-khoa-bieu`)

**Files:**
- Create: `app/(teacher)/thoi-khoa-bieu/{page.tsx,TimetableClient.tsx,actions.ts}`, `lib/timetable/palette.ts`, `lib/timetable/queries.ts`, `lib/timetable/export.ts`
- Test: `tests/unit/timetable.test.ts`, `tests/e2e/timetable.spec.ts`

**Interfaces:**
- Produces:
  - `SUBJECT_PALETTE: { bg: string; ink: string }[]` = 11 cặp `PAL` của thiết kế; `paletteFor(ink: string)` trả cặp có `ink` đó, không thấy → cặp cuối; `nextInk(ink)` → `ink` của cặp kế tiếp (vòng).
  - `getTimetable(classId)` → `{ subjects: {id; name; color; sortOrder; usedCount}[]; slots: Record<'<weekday>-<session>-<period>', subjectId | null>; saturday: boolean }`.
  - `buildTimetableWorkbook(...)`: ArrayBuffer `.xlsx` sheet "Thời khóa biểu" với hàng tiết × cột thứ, tách "BUỔI SÁNG" / "BUỔI CHIỀU".
  - Server Actions (requireTeacher + zod): `setSlot(weekday, session, period, subjectId | null)` (upsert/xóa dòng `timetable_slots`), `addSubject(name)`, `renameSubject(id, name)`, `cycleSubjectColor(id)`, `deleteSubject(id)` (map 23503 → `subject_in_use` kèm tên môn: `'Môn "<tên>" đang có trong thời khóa biểu. Cô hãy đổi các tiết đó sang môn khác trước khi xóa.'`; 23505 → `'Môn "<tên>" đã có trong danh sách.'`), `exportTimetable()`.

- [ ] **Step 1: Viết test thất bại:** unit palette (11 cặp, `nextInk` vòng, `paletteFor` không thấy → cặp cuối). e2e: "Cả tuần" hiện 5 cột thứ, nhãn "BUỔI SÁNG · 5 TIẾT", "BUỔI CHIỀU", 8 hàng tiết, không có giờ; "Theo ngày" + chip thứ → 1 cột; bấm một ô → "Đang sửa: Thứ Hai, sáng tiết 1" → chọn "Toán" → ô hiện "Toán" với màu của môn, tải lại vẫn còn; "Danh sách môn học của lớp": thêm "Kĩ năng sống" → xuất hiện; thêm "toán" → câu trùng; đổi tên "Toán" thành "Toán học" → ô đã gán đổi theo; bấm màu → màu đổi; xóa môn đang dùng → câu chặn; xóa môn chưa dùng → biến mất; "In / Xuất" → tải `.xlsx` có "Toán học" ở ô đúng; cột thứ hôm nay được tô như thiết kế (`#4F5BD5`). Dọn: xóa mọi `timetable_slots` của lớp, khôi phục môn seed.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Giao diện theo `Timetable.dc.html` (nút "Cả tuần"/"Theo ngày", chip thứ, lưới, panel "Đang sửa" với `<select>` môn và "Xong", danh sách môn với ô màu bấm để đổi, ô tên sửa tại chỗ (lưu khi blur/Enter), "+ Thêm môn", dòng "Học sinh chỉ được xem."). Thứ Bảy hiện khi `timetable_saturday` bật. "Sao chép thời khóa biểu" (từ năm học trước) để đợt 6 — ẩn nút cho tới khi có lớp năm trước. "In / Xuất": in bằng `window.print()` với CSS in chỉ lưới, và nút tải Excel.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/timetable.spec.ts` → PASS; ảnh `test-results/timetable-desktop.png`.
- [ ] **Step 5:** Commit `feat: add timetable page`.

---

### Task 4: Trang Thông báo (`/thong-bao`)

**Files:**
- Create: `app/(teacher)/thong-bao/{page.tsx,AnnouncementsClient.tsx,actions.ts}`, `lib/announcements/queries.ts`, `lib/announcements/types.ts`
- Modify: `components/layout/Header.tsx` (không đổi hành vi chuông — xem Step 3), `lib/overview/queries.ts` nếu cần dùng chung query
- Test: `tests/e2e/announcements.spec.ts`

**Interfaces:**
- Produces:
  - `ANNOUNCEMENT_TYPES = ['Thông báo chung','Nhắc bài','Lịch kiểm tra','Hoạt động','Sự kiện của lớp']` và màu `COL` của thiết kế.
  - `getAnnouncements(classId, { includeArchived: false })` → ghim trước, mới trước; ảnh ký URL một lần.
  - Server Actions (requireTeacher + zod: tiêu đề 1..120, nội dung 1..2000, loại thuộc danh sách): `saveAnnouncement({ id?, title, body, type, pinned })`, `togglePin(id)`, `archiveAnnouncement(id)` (đặt `archived_at`), `uploadAnnouncementImage(id, FormData)` (nén ở client như Hồ sơ, `class-media/<lớp>/announcements/<uuid>.<ext>`), `removeAnnouncementImage(id)`.

- [ ] **Step 1: Viết test thất bại:** "Đăng thông báo mới" với tiêu đề rỗng → `'Cô hãy nhập tiêu đề và nội dung.'`; đăng "Ôn tập Toán" loại "Nhắc bài", ghim → câu `'Đã đăng thông báo. Học sinh sẽ thấy ở trang Thông báo.'`, thẻ lên đầu với "Đang ghim"; "Sửa" → form "Sửa thông báo" + "Lưu thay đổi" + "Hủy sửa" → lưu → `'Đã lưu thay đổi. Học sinh thấy nội dung mới.'`; "Bỏ ghim"; "Xóa" → nút đổi "Bấm lần nữa để xóa" → bấm lần nữa → `'Đã xóa thông báo.'`, thẻ biến mất, DB còn dòng với `archived_at`; "Đính kèm hình ảnh" ảnh nhỏ → thẻ hiện ảnh; Tổng quan "Tín hiệu từ trạm chỉ huy" hiện thông báo ghim, không hiện thông báo đã xóa. Dọn dữ liệu.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Giao diện theo `Announcements.dc.html` (form trái: Tiêu đề, Loại, Nội dung, "Đính kèm hình ảnh", công tắc "Ghim lên đầu", "Hủy sửa", nút đăng; danh sách phải với nhãn loại, ngày, "Đang ghim", "Ghim/Bỏ ghim", "Sửa", "Xóa" hai bước). Ngày hiển thị: `formatDayLabel` của `published_at`. Chuông ở Header: giữ link `/thong-bao`, không hiện số (giáo viên là người đăng, số "thông báo mới" không có nghĩa với cô) — ghi quyết định này.
- [ ] **Step 4:** `pnpm test && pnpm lint && pnpm build && pnpm test:e2e tests/e2e/announcements.spec.ts tests/e2e/overview.spec.ts` → PASS; ảnh `test-results/announcements-desktop.png`.
- [ ] **Step 5:** Commit `feat: add announcements page`.

---

### Task 5: Kiểm tra cuối đợt

- [ ] **Step 1:** `pnpm supabase db reset && pnpm seed:dev && pnpm db:test && pnpm test && pnpm lint && pnpm build && pnpm test:e2e && bash scripts/db/reward-race.sh` → PASS.
- [ ] **Step 2:** So ảnh ba trang với thiết kế; ghi `docs/superpowers/plans/2026-11-01-dot-4-ghi-chu.md`.
- [ ] **Step 3:** Commit `chore: phase 4 verification notes`.
