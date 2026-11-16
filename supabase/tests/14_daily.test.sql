begin;
select plan(7);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2') on conflict do nothing;
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

select is((select timetable_saturday from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), false, 'timetable_saturday mặc định false');

-- cô T
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

-- môn học
select throws_ok($$delete from public.subjects where id = '00000000-0000-0000-0000-0000000000f1'$$, '23503', null, 'xóa môn đang dùng bị chặn');
select lives_ok($$delete from public.subjects where id = '00000000-0000-0000-0000-0000000000f2'$$, 'xóa môn không dùng');
select is((select count(*)::int from public.subjects where id = '00000000-0000-0000-0000-0000000000f2'), 0, 'môn không dùng đã mất khỏi bảng');
select throws_ok($$insert into public.subjects (class_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'TOÁN')$$, '23505', null, 'trùng tên khác hoa thường');
select is((select subject_id::text from public.timetable_slots where weekday = 1), '00000000-0000-0000-0000-0000000000f1', 'ô vẫn trỏ môn');

select * from finish();
rollback;
