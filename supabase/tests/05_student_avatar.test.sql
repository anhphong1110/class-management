begin;
select plan(7);

insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'),
  ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2') on conflict do nothing;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'tb@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'Học sinh A');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a', 'A', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.b', 'Cô B', null);
insert into public.avatar_library (id, class_id, kind, preset, label, hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'preset', '{}', 'Hợp lệ', false),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'preset', '{}', 'Đang ẩn', true);

-- học sinh
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1')$$,
  'P0001', 'not_allowed', 'học sinh không gọi được set_student_avatar');

-- giáo viên lớp B
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1')$$,
  'P0001', 'not_allowed', 'giáo viên lớp khác không đổi được');

-- giáo viên lớp A
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2')$$,
  'P0001', 'avatar_not_found', 'avatar ẩn');
select lives_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1')$$,
  'giáo viên đổi avatar cho học sinh chưa có tài khoản hay có tài khoản');

reset role;
select is((select avatar_id from public.students where id = '00000000-0000-0000-0000-0000000000a1'),
  '00000000-0000-0000-0000-0000000000f1'::uuid, 'students.avatar_id đã đổi');
select is((select count(*)::int from public.audit_logs where action = 'avatar.set'
           and class_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'audit_logs ghi avatar.set');

set local role anon;
select throws_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1')$$,
  '42501', null, 'anon không có quyền thực thi');

select * from finish();
rollback;
