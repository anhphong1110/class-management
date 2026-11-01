begin;
select plan(10);

create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;

insert into public.classes (id, class_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000c1', '5A', null), ('00000000-0000-0000-0000-0000000000c2', '5B cũ', now());
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 'ok@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'sa@test.local'), ('00000000-0000-0000-0000-0000000000d4', 'ca@test.local'),
  ('00000000-0000-0000-0000-0000000000d5', 'ld@test.local'), ('00000000-0000-0000-0000-0000000000d6', 'np@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'OK', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'Lưu trữ', now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'Lớp cũ', null),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'HS05', 5, 'Khóa', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id, login_disabled) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null, false),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.ok', 'OK', '00000000-0000-0000-0000-0000000000a2', false),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.sa', 'SA', '00000000-0000-0000-0000-0000000000a3', false),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c2', 'student', 'hs.ca', 'CA', '00000000-0000-0000-0000-0000000000a4', false),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.ld', 'LD', '00000000-0000-0000-0000-0000000000a5', true);

set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select status from public.my_student_session()), 'ok', 'giáo viên: ok');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is((select status from public.my_student_session()), 'ok', 'học sinh bình thường: ok');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select status from public.my_student_session()), 'archived_student', 'học sinh đã lưu trữ');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select is((select status from public.my_student_session()), 'archived_class', 'học sinh của lớp đã lưu trữ');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d5');
select is((select status from public.my_student_session()), 'login_disabled', 'tài khoản bị khóa');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d6');
select is((select status from public.my_student_session()), 'no_profile', 'có Auth nhưng không có profiles');
select is((select count(*)::int from public.my_student_session()), 1, 'luôn đúng một dòng');

reset role;
select ok(not has_function_privilege('anon', 'public.my_student_session()', 'execute')
  and not has_function_privilege('public', 'public.my_student_session()', 'execute')
  and has_function_privilege('authenticated', 'public.my_student_session()', 'execute'), 'quyền my_student_session');
select is((select p.prosecdef from pg_proc p where p.proname = 'my_student_session'), true, 'security definer');
select ok((select 'search_path=""' = any (p.proconfig) from pg_proc p where p.proname = 'my_student_session'), 'search_path rỗng');

select * from finish();
rollback;
