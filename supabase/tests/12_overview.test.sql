begin;
select plan(9);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'hs@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');

-- Kỳ: [2026-11-02 00:00Z, 2026-11-09 00:00Z). Ba nhóm học sinh A1/A2 cho ba tình huống; lớp 5B không được tính.
-- 1) cộng 3 + cộng 2 + trừ 4 -> 5 / 4
insert into public.star_transactions (id, class_id, student_id, delta, kind, batch_id, created_at) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 3, 'award', gen_random_uuid(), '2026-11-03 01:00:00+00'),
  ('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 2, 'award', gen_random_uuid(), '2026-11-03 02:00:00+00'),
  ('00000000-0000-0000-0000-00000000e003', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -4, 'penalty', gen_random_uuid(), '2026-11-03 03:00:00+00'),
  ('00000000-0000-0000-0000-00000000e004', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 9, 'award', gen_random_uuid(), '2026-11-03 03:00:00+00'),
  -- ngoài kỳ (đúng biên trên): không tính
  ('00000000-0000-0000-0000-00000000e005', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 7, 'award', gen_random_uuid(), '2026-11-09 00:00:00+00');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select row(awarded, penalized)::text from public.class_star_totals_between('2026-11-02 00:00:00+00', '2026-11-09 00:00:00+00')), '(5,4)', 'cộng và trừ, biên trên loại trừ, lớp khác không tính');

-- 2) hoàn tác cả hai trong kỳ về 0 / 0
reset role;
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'reversal', '00000000-0000-0000-0000-00000000e002', gen_random_uuid(), '2026-11-04 01:00:00+00'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 4, 'reversal', '00000000-0000-0000-0000-00000000e003', gen_random_uuid(), '2026-11-04 02:00:00+00');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select row(awarded, penalized)::text from public.class_star_totals_between('2026-11-02 00:00:00+00', '2026-11-09 00:00:00+00')), '(3,0)', 'hoàn tác trừ ngược vào nhóm của dòng gốc');

-- 3) hoàn tác trong kỳ của dòng cộng thuộc tuần trước: giảm tuần này, không xuống dưới 0
reset role;
insert into public.star_transactions (id, class_id, student_id, delta, kind, batch_id, created_at) values
  ('00000000-0000-0000-0000-00000000e006', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 2, 'award', gen_random_uuid(), '2026-10-20 01:00:00+00');
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -2, 'reversal', '00000000-0000-0000-0000-00000000e006', gen_random_uuid(), '2026-11-05 01:00:00+00');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select row(awarded, penalized)::text from public.class_star_totals_between('2026-11-02 00:00:00+00', '2026-11-09 00:00:00+00')), '(1,0)', 'hoàn tác dòng tuần trước giảm tuần này');
select is((select row(awarded, penalized)::text from public.class_star_totals_between('2026-11-05 00:00:00+00', '2026-11-06 00:00:00+00')), '(0,0)', 'chỉ có hoàn tác trong kỳ: không âm');
select is((select row(awarded, penalized)::text from public.class_star_totals_between('2026-12-01 00:00:00+00', '2026-12-08 00:00:00+00')), '(0,0)', 'kỳ trống: 0 / 0');
select is((select row(awarded, penalized)::text from public.class_star_totals_between(null, null)), '(10,0)', 'không giới hạn kỳ: cộng ròng theo nhóm gốc');

-- Quyền: học sinh bị từ chối; anon không có EXECUTE
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select * from public.class_star_totals_between(null, null)$$, 'P0001', 'not_allowed', 'học sinh không gọi được');
reset role;
select ok(not has_function_privilege('anon', 'public.class_star_totals_between(timestamptz, timestamptz)', 'execute'), 'anon không có EXECUTE');
select ok(has_function_privilege('authenticated', 'public.class_star_totals_between(timestamptz, timestamptz)', 'execute'), 'authenticated có EXECUTE');

select * from finish();
rollback;
