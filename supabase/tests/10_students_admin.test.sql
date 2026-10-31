begin;
select plan(5);

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

select * from finish();
rollback;
