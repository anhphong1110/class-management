begin;
select plan(52);

create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;

-- Kỳ chính: thứ Hai 2026-03-02 .. Chủ Nhật 2026-03-08 (7 ngày); kỳ trước cùng độ dài: 2026-02-23 .. 2026-03-01.
create function pg_temp.rep(b text default 'day') returns jsonb language sql
as $$ select public.report_summary(date '2026-03-02', date '2026-03-08', b) $$;
grant execute on function pg_temp.rep(text) to public;

insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3 lưu trữ', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');
insert into public.star_criteria (id, class_id, label, kind) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Phát biểu', 'award'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'Giúp bạn', 'award'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Quên đồ', 'penalty');

-- Sổ sao (giờ Việt Nam, +07)
insert into public.star_transactions (id, class_id, student_id, delta, kind, criterion_id, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 5, 'award', '00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), '2026-03-02 00:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 3, 'award', '00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), '2026-03-04 12:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 4, 'award', '00000000-0000-0000-0000-0000000000e2', gen_random_uuid(), '2026-03-08 23:59:59+07'),
  ('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 10, 'award', '00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), '2026-03-04 09:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a5', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'penalty', '00000000-0000-0000-0000-0000000000e3', gen_random_uuid(), '2026-03-03 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a6', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -6, 'penalty', '00000000-0000-0000-0000-0000000000e3', gen_random_uuid(), '2026-03-05 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a7', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 50, 'award', '00000000-0000-0000-0000-0000000000e2', gen_random_uuid(), '2026-03-03 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a8', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 7, 'award', null, gen_random_uuid(), '2026-03-09 00:00:00+07'),
  ('00000000-0000-0000-0000-0000000001a9', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'award', null, gen_random_uuid(), '2026-03-01 23:59:59+07'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 2, 'award', null, gen_random_uuid(), '2026-02-25 10:00:00+07');
-- hoàn tác lần cộng 10 và lần trừ 6
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -10, 'reversal', '00000000-0000-0000-0000-0000000001a4', gen_random_uuid(), '2026-03-05 09:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 6, 'reversal', '00000000-0000-0000-0000-0000000001a6', gen_random_uuid(), '2026-03-05 11:00:00+07');
-- Đổi quà dùng sao: không thuộc sao thi đua
insert into public.rewards (id, class_id, name, cost, stock) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', 'Bút', 5, 30),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000c1', 'Nhãn', 3, 30);

-- Điểm danh
insert into public.attendance (class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-03-02', 'present'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-03-03', 'late'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-03-04', 'absent_excused'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-03-05', 'present'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-03-09', 'absent_unexcused'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '2026-03-02', 'absent_unexcused'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '2026-03-03', 'absent_unexcused'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '2026-03-04', 'present'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '2026-03-05', 'absent_excused'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', '2026-03-02', 'absent_unexcused');

-- Yêu cầu đổi quà
insert into public.reward_requests (class_id, student_id, reward_id, cost, status, decided_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f5', 5, 'approved', '2026-03-03 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f5', 5, 'delivered', '2026-03-08 23:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f6', 3, 'approved', '2026-03-04 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f5', 5, 'pending', null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f5', 5, 'rejected', '2026-03-04 10:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f5', 5, 'approved', '2026-03-09 00:00:00+07'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f5', 5, 'approved', '2026-03-04 10:00:00+07');

-- ===== quyền =====
select ok(not has_function_privilege('anon', 'public.report_summary(date,date,text)', 'execute')
  and not has_function_privilege('public', 'public.report_summary(date,date,text)', 'execute')
  and has_function_privilege('authenticated', 'public.report_summary(date,date,text)', 'execute'), 'quyền report_summary');
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = 'public.report_summary(date,date,text)'::regprocedure), 'security definer, search_path rỗng');

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select pg_temp.rep()$$, 'P0001', 'not_allowed', 'học sinh gọi thì not_allowed');

-- ===== từ chối khoảng/bucket sai =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.report_summary('2026-03-08', '2026-03-02', 'day')$$, 'P0001', 'invalid_range', 'from > to');
select throws_ok($$select public.report_summary('2026-01-01', '2027-02-05', 'month')$$, 'P0001', 'invalid_range', '401 ngày bị chặn');
select lives_ok($$select public.report_summary('2026-01-01', '2027-02-04', 'month')$$, '400 ngày vẫn được');
select throws_ok($$select pg_temp.rep('year')$$, 'P0001', 'invalid_range', 'bucket sai');
select throws_ok($$select public.report_summary(null, '2026-03-08', 'day')$$, 'P0001', 'invalid_range', 'from null');
select lives_ok($$select public.report_summary('2026-03-02', '2026-03-02', 'day')$$, 'một ngày vẫn được');

-- ===== kpis =====
select is(pg_temp.rep()->'kpis'->>'added', '12', 'added: bỏ lần cộng đã hoàn tác, bỏ học sinh lưu trữ, tính cả hai đầu');
select is(pg_temp.rep()->'kpis'->>'deducted', '2', 'deducted dương, bỏ lần trừ đã hoàn tác');
select is(pg_temp.rep()->'kpis'->>'attendancePct', '50', 'attendancePct = (present+late)/tổng, bỏ học sinh lưu trữ');
select is(pg_temp.rep()->'kpis'->>'redeemed', '3', 'redeemed: approved+delivered có decided_at trong kỳ');
select is(pg_temp.rep()->'kpis'->>'improved', '2', 'improved: sao thi đua kỳ này > kỳ trước');
select is(jsonb_typeof(pg_temp.rep()->'kpis'->'added'), 'number', 'kpi là số');

-- ===== buckets theo ngày =====
select is(jsonb_array_length(pg_temp.rep()->'buckets'), 7, '7 mốc ngày');
select is((select jsonb_agg(b->>'label') from jsonb_array_elements(pg_temp.rep()->'buckets') b),
  '["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","CN"]'::jsonb, 'nhãn ngày');
select is((select jsonb_agg((b->>'added')::int) from jsonb_array_elements(pg_temp.rep()->'buckets') b),
  '[5,0,3,0,0,0,4]'::jsonb, 'added theo ngày (23:59:59 thuộc Chủ Nhật, 00:00 thuộc thứ Hai)');
select is((select jsonb_agg((b->>'deducted')::int) from jsonb_array_elements(pg_temp.rep()->'buckets') b),
  '[0,2,0,0,0,0,0]'::jsonb, 'deducted theo ngày');

-- khoảng quá 7 ngày: nhãn ngày có dd/mm
select is((public.report_summary('2026-03-02', '2026-03-09', 'day')->'buckets'->0->>'label'), 'Thứ 2 02/03', 'nhãn ngày kèm dd/mm khi quá 7 ngày');
select is((public.report_summary('2026-03-02', '2026-03-09', 'day')->'buckets'->7->>'label'), 'Thứ 2 09/03', 'nhãn mốc cuối kèm dd/mm');

-- ===== buckets theo tuần và tháng =====
select is((select jsonb_agg(b->>'label') from jsonb_array_elements(public.report_summary('2026-02-23', '2026-03-08', 'week')->'buckets') b),
  '["Tuần 1","Tuần 2"]'::jsonb, 'nhãn tuần');
select is((select jsonb_agg((b->>'added')::int) from jsonb_array_elements(public.report_summary('2026-02-23', '2026-03-08', 'week')->'buckets') b),
  '[3,12]'::jsonb, 'added theo tuần (kể cả mốc kỳ trước trong khoảng)');
select is((select jsonb_agg(b->>'label') from jsonb_array_elements(public.report_summary('2026-02-20', '2026-03-08', 'month')->'buckets') b),
  '["T2","T3"]'::jsonb, 'nhãn tháng');
select is((select jsonb_agg((b->>'added')::int) from jsonb_array_elements(public.report_summary('2026-02-20', '2026-03-08', 'month')->'buckets') b),
  '[2,13]'::jsonb, 'added theo tháng (1/3 23:59:59 thuộc T3)');
select is((select jsonb_agg(b->>'label') from jsonb_array_elements(public.report_summary('2026-09-01', '2027-01-31', 'month')->'buckets') b),
  '["T9","T10","T11","T12","T1"]'::jsonb, 'tháng qua năm: đủ mốc, kể cả mốc 0');

-- ===== attendance =====
select is(pg_temp.rep()->'attendance', '{"present":38,"late":12,"excused":25,"unexcused":25}'::jsonb, 'attendance: tổng 100 (chia phần dư theo phần lớn nhất)');
select is((select (a->>'present')::int + (a->>'late')::int + (a->>'excused')::int + (a->>'unexcused')::int from (select pg_temp.rep()->'attendance' a) x), 100, 'tổng attendance = 100');
select is(pg_temp.rep()->'lowAttendance', '[{"name":"A2","days":3},{"name":"A1","days":1}]'::jsonb, 'lowAttendance: có phép + không phép, bỏ lưu trữ');

-- ===== criteria =====
select is(pg_temp.rep()->'criteria',
  '[{"label":"Phát biểu","kind":"award","n":2},{"label":"Giúp bạn","kind":"award","n":1},{"label":"Quên đồ","kind":"penalty","n":1}]'::jsonb,
  'criteria: bỏ lần đã hoàn tác và học sinh lưu trữ, n giảm dần');

-- ===== progress =====
select is(jsonb_array_length(pg_temp.rep()->'progress'), 2, 'progress chỉ có up > 0');
select is(pg_temp.rep()->'progress'->0->>'studentId', '00000000-0000-0000-0000-0000000000a1', 'progress[0] là A1');
select is(pg_temp.rep()->'progress'->0->>'up', '5', 'A1 tăng 5 (6 so với 1)');
select is(pg_temp.rep()->'progress'->1->>'up', '2', 'A2 tăng 2 (4 so với 2, hoàn tác tính vào sao thi đua)');
select ok((pg_temp.rep()->'progress'->0) ? 'avatarId' and (pg_temp.rep()->'progress'->0) ? 'name', 'progress có name và avatarId');

-- ===== gifts =====
select is(pg_temp.rep()->'gifts', '[{"label":"Bút","n":2},{"label":"Nhãn","n":1}]'::jsonb, 'gifts theo tên quà, n giảm dần, bỏ pending/rejected/ngoài kỳ/lưu trữ');

-- ===== khoảng không có dữ liệu =====
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'kpis', '{"added":0,"deducted":0,"attendancePct":0,"redeemed":0,"improved":0}'::jsonb, 'kỳ trống: mọi KPI = 0');
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'attendance', '{"present":0,"late":0,"excused":0,"unexcused":0}'::jsonb, 'kỳ trống: attendance toàn 0');
select is(jsonb_array_length(public.report_summary('2025-01-01', '2025-01-07', 'day')->'buckets'), 7, 'kỳ trống: vẫn đủ 7 mốc');
select is((select count(*)::int from jsonb_array_elements(public.report_summary('2025-01-01', '2025-01-07', 'day')->'buckets') b
  where (b->>'added')::int = 0 and (b->>'deducted')::int = 0), 7, 'kỳ trống: mọi mốc 0');
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'lowAttendance', '[]'::jsonb, 'kỳ trống: lowAttendance rỗng');
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'criteria', '[]'::jsonb, 'kỳ trống: criteria rỗng');
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'progress', '[]'::jsonb, 'kỳ trống: progress rỗng');
select is(public.report_summary('2025-01-01', '2025-01-07', 'day')->'gifts', '[]'::jsonb, 'kỳ trống: gifts rỗng');

-- ===== chỉ thấy lớp mình =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is(pg_temp.rep()->'kpis'->>'added', '0', 'cô lớp khác không thấy sao lớp 5A');
select is(pg_temp.rep()->'kpis'->>'redeemed', '0', 'cô lớp khác không thấy đổi quà lớp 5A');
select is(pg_temp.rep()->'lowAttendance', '[]'::jsonb, 'cô lớp khác không thấy điểm danh lớp 5A');

-- ===== lần cộng bị hoàn tác sau kỳ vẫn bị loại =====
reset role;
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -4, 'reversal', '00000000-0000-0000-0000-0000000001a3', gen_random_uuid(), '2026-03-20 10:00:00+07');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(pg_temp.rep()->'kpis'->>'added', '8', 'lần cộng bị hoàn tác sau kỳ cũng bị loại khỏi added');
select is(pg_temp.rep()->'kpis'->>'deducted', '2', 'deducted không đổi');
select is((select jsonb_agg((b->>'added')::int) from jsonb_array_elements(pg_temp.rep()->'buckets') b), '[5,0,3,0,0,0,0]'::jsonb, 'mốc Chủ Nhật không còn lần cộng đã hoàn tác');

-- ===== không ghi gì =====
reset role;
select is((select count(*)::int from public.star_transactions where class_id = '00000000-0000-0000-0000-0000000000c1'), 13, 'report_summary không ghi sổ sao');
select is((select count(*)::int from public.audit_logs where action like 'report%'), 0, 'không có nhật ký báo cáo');

select * from finish();
rollback;
