begin;
select plan(27);

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
  'P0001', 'code_exists', 'mã đã có làm cả lô lỗi code_exists');
select throws_ok(
  $$select public.import_students('[{"roll_no":30,"full_name":"Mới","code":"HS60"},{"roll_no":31,"full_name":"Trùng","code":"HS60"}]'::jsonb)$$,
  '23505', null, 'mã trùng trong lô làm cả lô lỗi 23505');
select is((select count(*)::int from public.students where full_name in ('Mới', 'Trùng')), 0, 'không dòng nào được thêm');

-- mã mới trùng mã đã lưu trữ (HS05) hoặc khác hoa thường
select throws_ok($$select public.import_students('[{"roll_no":40,"full_name":"A","code":"hs05"}]'::jsonb)$$, 'P0001', 'code_exists', 'mã trùng học sinh đã lưu trữ (không phân biệt hoa thường): code_exists');
-- khóa lỗi đầu vào
select throws_ok($$select public.import_students('[{"roll_no":1,"full_name":"  ","code":null}]'::jsonb)$$, 'P0001', 'name_required', 'tên rỗng');
select throws_ok(format($$select public.import_students('[{"roll_no":1,"full_name":"%s","code":null}]'::jsonb)$$, repeat('a', 201)), 'P0001', 'name_required', 'tên dài hơn 200 ký tự');
select throws_ok($$select public.import_students('[{"roll_no":0,"full_name":"A","code":null}]'::jsonb)$$, 'P0001', 'invalid_roll_no', 'số thứ tự 0');
select throws_ok($$select public.import_students('[{"roll_no":10000,"full_name":"A","code":null}]'::jsonb)$$, 'P0001', 'invalid_roll_no', 'số thứ tự 10000');
select throws_ok($$select public.import_students('[{"roll_no":"x","full_name":"A","code":null}]'::jsonb)$$, 'P0001', 'invalid_roll_no', 'số thứ tự "x"');
select throws_ok($$select public.import_students('[]'::jsonb)$$, 'P0001', 'invalid_rows', 'mảng rỗng');
select throws_ok($$select public.import_students((select jsonb_agg(jsonb_build_object('roll_no', null, 'full_name', 'N' || n, 'code', null)) from generate_series(1, 501) n))$$, 'P0001', 'invalid_rows', '501 dòng');
select throws_ok($$select public.import_students('[{"roll_no":1,"full_name":"A","code":"HS 1!"}]'::jsonb)$$, 'P0001', 'invalid_rows', 'mã sai định dạng');

-- chuẩn hóa mã và sinh mã qua HS99
select is(public.import_students('[{"roll_no":null,"full_name":"Thường","code":" hs98 "},{"roll_no":null,"full_name":"Tự sinh 1","code":null},{"roll_no":null,"full_name":"Tự sinh 2","code":null}]'::jsonb), 3, 'import mã có chữ thường');
select results_eq(
  $$select code from public.students where full_name in ('Thường', 'Tự sinh 1', 'Tự sinh 2') order by roll_no$$,
  $$values ('HS98'::text), ('HS99'::text), ('HS100'::text)$$,
  'mã chuẩn hóa HS98, sinh tiếp HS99, HS100 (không cắt)'
);
select is(public.next_student_code('00000000-0000-0000-0000-0000000000c1'), 'HS101', 'next_student_code sau HS100 -> HS101');
reset role;
delete from public.students where full_name = 'Tự sinh 1';
update public.students set code = 'HS99' where full_name = 'Tự sinh 2';
update public.students set code = 'HS97' where full_name = 'Thường';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is(public.next_student_code('00000000-0000-0000-0000-0000000000c1'), 'HS100', 'max HS99 -> next_student_code HS100');
select is(public.import_students('[{"roll_no":null,"full_name":"Sau99","code":null}]'::jsonb), 1, 'import khi max HS99');
select is((select code from public.students where full_name = 'Sau99'), 'HS100', 'import sinh HS100 khi max HS99');

select * from finish();
rollback;
