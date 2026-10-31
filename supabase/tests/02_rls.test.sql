begin;
select plan(21);

-- dữ liệu nền (quyền postgres)
insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'),
  ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'b@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'Học sinh A'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'Học sinh B'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'Học sinh lớp khác');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a', 'A', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.b', 'B', '00000000-0000-0000-0000-0000000000b1');
insert into public.star_transactions (class_id, student_id, delta, kind, note) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 5, 'award', null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'penalty', 'Nói chuyện riêng'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 4, 'award', null),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 7, 'award', null);
insert into public.attendance (class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-11-02', 'present');

-- vai học sinh A
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);

select is((select count(*)::int from public.star_transactions), 2, 'A chỉ thấy giao dịch của mình');
select is((select count(*)::int from public.students), 1, 'A chỉ thấy hồ sơ học sinh của mình');
select is((select count(*)::int from public.profiles), 1, 'A chỉ thấy profile của mình');
select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'award')
$$, '42501', null, 'A không insert được giao dịch');
select is_empty($$update public.students set full_name = 'x' returning 1$$, 'A không update được students');
select is_empty($$update public.class_settings set require_approval = false returning 1$$, 'A không update được class_settings');
select is((select count(*)::int from public.attendance), 0, 'cờ điểm danh tắt: A không thấy điểm danh');

reset role;
update public.class_settings set student_can_view_attendance = true
  where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.attendance), 1, 'cờ điểm danh bật: A thấy 1 dòng');

reset role;
update public.class_settings set student_can_view_history = false
  where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.star_transactions), 0, 'cờ lịch sử tắt: A không thấy giao dịch');
reset role;
update public.class_settings set student_can_view_history = true
  where class_id = '00000000-0000-0000-0000-0000000000c1';

-- vai giáo viên T
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

select is((select count(*)::int from public.star_transactions), 3, 'T thấy 3 giao dịch của lớp mình, không thấy lớp khác');
select is((select count(*)::int from public.students), 2, 'T thấy học sinh lớp mình');
select is((select count(*)::int from public.profiles), 3, 'T thấy profile cùng lớp');
select is_empty($$delete from public.star_transactions returning 1$$, 'T không xóa được giao dịch');
select isnt_empty($$update public.students set roll_no = roll_no + 10 returning 1$$, 'T update được học sinh lớp mình');
select lives_ok($$
  insert into public.groups (class_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Tổ 1')
$$, 'T insert được vào lớp mình');
select throws_ok($$
  insert into public.groups (class_id, name) values ('00000000-0000-0000-0000-0000000000c2', 'Tổ lạ')
$$, '42501', null, 'T không insert được vào lớp khác');
select throws_ok($$
  insert into public.audit_logs (class_id, action, entity) values ('00000000-0000-0000-0000-0000000000c1', 'x', 'y')
$$, '42501', null, 'T không insert trực tiếp audit_logs');

-- vai anon
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select is((select count(*)::int from public.star_transactions), 0, 'anon: star_transactions rỗng');
select is((select count(*)::int from public.students), 0, 'anon: students rỗng');
select is((select count(*)::int from public.profiles), 0, 'anon: profiles rỗng');
select throws_ok($$ insert into public.groups (class_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'x') $$,
  '42501', null, 'anon không insert được');

select * from finish();
rollback;
