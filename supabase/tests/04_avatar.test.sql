begin;
select plan(17);

-- dữ liệu nền (quyền postgres)
insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'),
  ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values
  ('00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000c2') on conflict do nothing;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 'a@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'Học sinh A');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a', 'A', '00000000-0000-0000-0000-0000000000a1');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d4', 'tb@test.local');
insert into public.profiles (id, class_id, role, username, display_name) values
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.b', 'Cô B');
insert into public.avatar_library (id, class_id, kind, preset, label, hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'preset', '{}', 'Hợp lệ', false),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'preset', '{}', 'Đang ẩn', true),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c2', 'preset', '{}', 'Lớp khác', false);

select is((select file_size_limit from storage.buckets where id = 'class-media'), 5242880::bigint, 'bucket class-media giới hạn 5 MB');

-- vai học sinh A
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);

select lives_ok($$select public.set_my_avatar('00000000-0000-0000-0000-0000000000f1')$$, 'A đổi avatar hợp lệ');
select is((select avatar_id from public.students where id = '00000000-0000-0000-0000-0000000000a1'),
  '00000000-0000-0000-0000-0000000000f1'::uuid, 'students.avatar_id đã đổi');
select throws_ok($$select public.set_my_avatar('00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'avatar_not_found', 'avatar đang ẩn');
select throws_ok($$select public.set_my_avatar('00000000-0000-0000-0000-0000000000f3')$$, 'P0001', 'avatar_not_found', 'avatar lớp khác');
select throws_ok($$select public.set_avatar_for('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f1')$$,
  'P0001', 'not_allowed', 'A không gọi được set_avatar_for');

reset role;
update public.class_settings set student_can_change_avatar = false
  where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_my_avatar('00000000-0000-0000-0000-0000000000f1')$$, 'P0001', 'avatar_not_allowed', 'cờ tắt');

-- vai giáo viên T
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.set_avatar_for('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f1')$$, 'T đổi avatar cho học sinh');

reset role;
select is((select count(*)::int from public.audit_logs where action = 'avatar.set'
  and entity_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2')), 2, 'audit_logs ghi avatar.set');

-- Storage: policy theo thư mục lớp
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('class-media', '00000000-0000-0000-0000-0000000000c1/avatars/x.png', '00000000-0000-0000-0000-0000000000d1')$$,
  'giáo viên lớp A tải ảnh vào thư mục lớp A');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$insert into storage.objects (bucket_id, name) values ('class-media', '00000000-0000-0000-0000-0000000000c1/avatars/y.png')$$,
  '42501', null, 'giáo viên lớp B không tải được vào thư mục lớp A');
select is((select count(*)::int from storage.objects where bucket_id = 'class-media'), 0, 'giáo viên lớp B không thấy ảnh lớp A');
select throws_ok($$select public.set_avatar_for('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f3')$$,
  'P0001', 'not_allowed', 'giáo viên lớp B không đổi được avatar tài khoản lớp A');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$insert into storage.objects (bucket_id, name) values ('class-media', '00000000-0000-0000-0000-0000000000c1/avatars/z.png')$$,
  '42501', null, 'học sinh lớp A không tải ảnh lên được');
select is((select count(*)::int from storage.objects where bucket_id = 'class-media'), 1, 'học sinh lớp A thấy ảnh lớp A');

reset role;
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id = 'class-media'), 0, 'anon không thấy ảnh class-media');

-- Giáo viên đổi avatar của chính mình (nhánh profiles.avatar_id)
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select public.set_avatar_for('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1');
reset role;
select is((select avatar_id from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'),
  '00000000-0000-0000-0000-0000000000f1'::uuid, 'giáo viên đổi avatar của chính mình');

select * from finish();
rollback;
