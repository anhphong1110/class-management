begin;
select plan(11);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'hs@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at)
select ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid,
       '00000000-0000-0000-0000-0000000000c1', 'HS' || lpad(n::text, 2, '0'), n, 'A' || n,
       case when n = 10 then now() end
  from generate_series(1, 10) n;
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS40', 1, 'B1');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-000000000101');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.next_student_code('00000000-0000-0000-0000-0000000000c1')$$, 'P0001', 'not_allowed', 'học sinh gọi: not_allowed');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is(public.next_student_code('00000000-0000-0000-0000-0000000000c1'), 'HS11', 'HS01–HS10 (kể cả đã lưu trữ) -> HS11');
select throws_ok($$select public.next_student_code('00000000-0000-0000-0000-0000000000c2')$$, 'P0001', 'not_allowed', 'lớp khác: not_allowed');

reset role;
delete from public.students where code = 'HS10' and class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is(public.next_student_code('00000000-0000-0000-0000-0000000000c1'), 'HS10', 'bỏ HS10 -> HS10');
reset role;
delete from public.students where class_id = '00000000-0000-0000-0000-0000000000c1' and id <> '00000000-0000-0000-0000-000000000101';
update public.students set code = 'XX01' where id = '00000000-0000-0000-0000-000000000101';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is(public.next_student_code('00000000-0000-0000-0000-0000000000c1'), 'HS01', 'không còn mã HS nào -> HS01');

-- import_students
reset role;
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-000000000191', '00000000-0000-0000-0000-0000000000c1', 'HS05', 5, 'Cũ', now());
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.import_students('[{"roll_no":null,"full_name":"X","code":null}]'::jsonb)$$, 'P0001', 'not_allowed', 'học sinh gọi import: not_allowed');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is(public.import_students('[{"roll_no":null,"full_name":"Lan","code":null},{"roll_no":20,"full_name":"Huy","code":null}]'::jsonb), 2, 'import 2 dòng trả 2');
select results_eq(
  $$select code, roll_no from public.students where full_name in ('Lan', 'Huy') order by code$$,
  $$values ('HS06'::text, 21), ('HS07'::text, 20)$$,
  'mã tiếp nối sau HS05 (đã lưu trữ), số thứ tự trống tiếp nối số lớn nhất'
);
select is((select count(*)::int from public.audit_logs where action = 'students.import' and class_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'ghi audit students.import');
select throws_ok(
  $$select public.import_students('[{"roll_no":30,"full_name":"Mới","code":null},{"roll_no":31,"full_name":"Trùng","code":"HS06"}]'::jsonb)$$,
  '23505', null, 'mã trùng làm cả lô lỗi 23505');
select is((select count(*)::int from public.students where full_name in ('Mới', 'Trùng')), 0, 'không dòng nào được thêm');

select * from finish();
rollback;
