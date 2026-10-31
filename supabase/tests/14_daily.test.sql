begin;
select plan(29);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'hs@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3', null),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c1', 'HS07', 7, 'A7', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');
insert into public.subjects (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Toán'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Thể dục');
insert into public.timetable_slots (class_id, weekday, session, period, subject_id) values
  ('00000000-0000-0000-0000-0000000000c1', 1, 'morning', 1, '00000000-0000-0000-0000-0000000000f1');

select lives_ok($$insert into public.subjects (class_id, name) values ('00000000-0000-0000-0000-0000000000c2', 'Toán')$$, 'cùng tên môn được phép ở lớp khác');

create temp table today (d date);
grant all on today to authenticated;
insert into today select (now() at time zone 'Asia/Ho_Chi_Minh')::date;

select ok(not has_function_privilege('anon', 'public.save_attendance(date,jsonb)', 'execute'), 'anon không EXECUTE');
select ok(has_function_privilege('authenticated', 'public.save_attendance(date,jsonb)', 'execute'), 'authenticated có EXECUTE');
select is((select timetable_saturday from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), false, 'timetable_saturday mặc định false');

-- học sinh
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.save_attendance((select d from today), '[]'::jsonb)$$, 'P0001', 'not_allowed', 'học sinh không điểm danh');

-- cô T
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

select is(public.save_attendance((select d from today), jsonb_build_array(
  jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000000a1', 'status', 'present'),
  jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000000a2', 'status', 'late'),
  jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000000a3', 'status', 'absent_excused'))), 3, 'lưu 3 bạn trả 3');
select is((select count(*)::int from public.attendance where date = (select d from today)), 3, '3 dòng');
select is((select count(*)::int from public.audit_logs where action = 'attendance.save' and class_id = '00000000-0000-0000-0000-0000000000c1' and (payload->>'count')::int = 3), 1, 'audit có class_id và count');

select is(public.save_attendance((select d from today), jsonb_build_array(
  jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000000a1', 'status', 'absent_unexcused'),
  jsonb_build_object('student_id', '00000000-0000-0000-0000-0000000000a2', 'status', null))), 2, 'lưu lại: 1 đổi, 1 xóa trả 2');
select is((select count(*)::int from public.attendance where date = (select d from today)), 2, 'còn 2 dòng');
select is((select status::text from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1' and date = (select d from today)), 'absent_unexcused', 'A1 trạng thái mới');
select is((select count(*)::int from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'A2 bị xóa');
select is((select count(*)::int from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'A1 vẫn một dòng');

select throws_ok($$select public.save_attendance((select d from today) + 1, '[]'::jsonb)$$, 'P0001', 'future_date', 'ngày mai');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000a7","status":"present"}]'::jsonb)$$, 'P0001', 'student_not_found', 'học sinh lưu trữ');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000b1","status":"present"}]'::jsonb)$$, 'P0001', 'student_not_found', 'lớp khác');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"present"},{"student_id":"00000000-0000-0000-0000-0000000000a3","status":"present"},{"student_id":"00000000-0000-0000-0000-0000000000b1","status":"present"}]'::jsonb)$$, 'P0001', 'student_not_found', 'một id sai thì không ghi gì');
select is((select status::text from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1' and date = (select d from today)), 'absent_unexcused', 'không ghi gì sau lỗi');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"present"},{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"late"}]'::jsonb)$$, 'P0001', 'invalid_rows', 'trùng id');
select throws_ok($$select public.save_attendance((select d from today), (select jsonb_agg(jsonb_build_object('student_id', gen_random_uuid(), 'status', 'present')) from generate_series(1, 101)))$$, 'P0001', 'invalid_rows', '101 phần tử');
select throws_ok($$select public.save_attendance((select d from today), '{"a":1}'::jsonb)$$, 'P0001', 'invalid_rows', 'không phải mảng');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"bogus"}]'::jsonb)$$, 'P0001', 'invalid_rows', 'trạng thái sai');
select throws_ok($$select public.save_attendance((select d from today), '[{"student_id":"00000000-0000-0000-0000-0000000000a1"}]'::jsonb)$$, 'P0001', 'invalid_rows', 'dòng thiếu khóa status bị từ chối');
select is((select count(*)::int from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1' and date = (select d from today)), 1, 'dòng thiếu status không xóa gì');

-- môn học
select throws_ok($$delete from public.subjects where id = '00000000-0000-0000-0000-0000000000f1'$$, '23503', null, 'xóa môn đang dùng bị chặn');
select lives_ok($$delete from public.subjects where id = '00000000-0000-0000-0000-0000000000f2'$$, 'xóa môn không dùng');
select is((select count(*)::int from public.subjects where id = '00000000-0000-0000-0000-0000000000f2'), 0, 'môn không dùng đã mất khỏi bảng');
select throws_ok($$insert into public.subjects (class_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'TOÁN')$$, '23505', null, 'trùng tên khác hoa thường');
select is((select subject_id::text from public.timetable_slots where weekday = 1), '00000000-0000-0000-0000-0000000000f1', 'ô vẫn trỏ môn');

select * from finish();
rollback;
