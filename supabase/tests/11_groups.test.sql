begin;
select plan(25);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'hs@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3', null),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1', 'HS04', 4, 'A4', null),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'HS05', 5, 'A5', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');
insert into public.groups (id, class_id, name, sort_order) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Tổ 1', 1),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Tổ 2', 2),
  ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000c2', 'Tổ B', 1);
insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'leader'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'deputy'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'member');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_group_role('00000000-0000-0000-0000-0000000000a2', 'leader')$$, 'P0001', 'not_allowed', 'học sinh: set_group_role not_allowed');
select throws_ok($$select public.move_student_to_group('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'not_allowed', 'học sinh: move not_allowed');
select throws_ok($$select public.create_group('Tổ 9')$$, 'P0001', 'not_allowed', 'học sinh: create_group not_allowed');
select throws_ok($$select public.delete_group('00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'not_allowed', 'học sinh: delete_group not_allowed');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

-- HS02 (phó) lên trưởng: HS01 thành member, phó để trống, chỉ 1 trưởng
select lives_ok($$select public.set_group_role('00000000-0000-0000-0000-0000000000a2', 'leader')$$, 'đặt HS02 làm trưởng');
select is((select role::text from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a1'), 'member', 'HS01 thành member');
select is((select count(*)::int from public.group_members where group_id = '00000000-0000-0000-0000-0000000000f1' and role = 'leader'), 1, 'chỉ 1 trưởng');
select is((select count(*)::int from public.group_members where group_id = '00000000-0000-0000-0000-0000000000f1' and role = 'deputy'), 0, 'phó để trống');

-- HS03 làm phó rồi HS01 làm phó: HS03 trở về member
select public.set_group_role('00000000-0000-0000-0000-0000000000a3', 'deputy');
select public.set_group_role('00000000-0000-0000-0000-0000000000a1', 'deputy');
select is((select role::text from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a3'), 'member', 'phó cũ về member');
select is((select role::text from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a1'), 'deputy', 'HS01 là phó');
-- HS01 (phó) lên trưởng: HS02 thành member, phó trống
select public.set_group_role('00000000-0000-0000-0000-0000000000a1', 'leader');
select is((select count(*)::int from public.group_members where group_id = '00000000-0000-0000-0000-0000000000f1' and role = 'deputy'), 0, 'trưởng mới từ phó: không còn phó');
select is((select role::text from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a2'), 'member', 'trưởng cũ về member');

select throws_ok($$select public.set_group_role('00000000-0000-0000-0000-0000000000a4', 'leader')$$, 'P0001', 'not_in_group', 'chưa có tổ: not_in_group');

-- chuyển tổ
select public.move_student_to_group('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2');
select results_eq($$select group_id, role::text from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a1'$$,
  $$values ('00000000-0000-0000-0000-0000000000f2'::uuid, 'member')$$, 'chuyển sang Tổ 2 với vai member');
select public.move_student_to_group('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000f2');
select is((select count(*)::int from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a4'), 1, 'thêm HS chưa có tổ');
select throws_ok($$select public.move_student_to_group('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f9')$$, 'P0001', 'not_allowed', 'tổ lớp khác: not_allowed');

-- xóa tổ
select throws_ok($$select public.delete_group('00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'group_not_empty', 'tổ còn người: group_not_empty');
select throws_ok($$select public.delete_group('00000000-0000-0000-0000-0000000000f9')$$, 'P0001', 'not_allowed', 'xóa tổ lớp khác: not_allowed');

-- bổ sung
select throws_ok($$select public.create_group('   ')$$, 'P0001', 'group_name_required', 'tên tổ rỗng: group_name_required');
select throws_ok($$select public.set_group_role('00000000-0000-0000-0000-0000000000b1', 'leader')$$, 'P0001', 'not_allowed', 'học sinh lớp khác: not_allowed');
create temp table newg (id uuid);
grant all on newg to authenticated;
insert into newg select public.create_group('Tổ 3');
select is((select sort_order from public.groups where id = (select id from newg)), 3, 'create_group: sort_order = max + 1');
select is((select count(*)::int from public.audit_logs where action = 'groups.create'), 1, 'audit groups.create');
select lives_ok($$select public.delete_group((select id from newg))$$, 'xóa tổ trống thành công');
select is((select count(*)::int from public.groups where name = 'Tổ 3'), 0, 'tổ trống đã bị xóa');
select ok((select count(*) from public.audit_logs where action = 'groups.set_role' and class_id = '00000000-0000-0000-0000-0000000000c1') > 0, 'audit groups.set_role');

select * from finish();
rollback;
