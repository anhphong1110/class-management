begin;
select plan(49);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2') on conflict do nothing;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'hs@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3', null),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1', 'HS04', 4, 'A4', null),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'HS05', 5, 'A5', null),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c1', 'HS06', 6, 'A6', null),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c1', 'HS07', 7, 'A7', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');
insert into public.star_criteria (id, class_id, label, kind, archived_at) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Phát biểu', 'award', null),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'Mất trật tự', 'penalty', null),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Cũ', 'award', now()),
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c2', 'Lớp B', 'award', null);

create temp table batches (k text primary key, v uuid);
grant all on batches to authenticated;

-- vai học sinh: không được gọi
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, null, 'x')$$, 'P0001', 'not_allowed', 'học sinh không cộng sao');
select throws_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, null, 'x')$$, 'P0001', 'not_allowed', 'học sinh không trừ sao');
select throws_ok($$select public.reverse_batch(gen_random_uuid())$$, 'P0001', 'not_allowed', 'học sinh không hoàn tác');

-- vai cô T
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

insert into batches select 'x1', public.award_stars(array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2']::uuid[], 2, '00000000-0000-0000-0000-0000000000e1', '');
select is((select count(*)::int from public.star_transactions where batch_id = (select v from batches where k = 'x1')), 2, 'award: 2 dòng cùng batch_id');
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 2, 'A1 competition 2');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 2, 'A1 available 2');

insert into batches select 'x2', public.award_stars(array['00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a3']::uuid[], 1, null, 'Tốt');
select is((select count(*)::int from public.star_transactions where batch_id = (select v from batches where k = 'x2')), 1, 'trùng id chỉ 1 dòng');

-- trừ sao
create temp table cnt (n int);
grant all on cnt to authenticated;
insert into cnt select count(*) from public.star_transactions;
select throws_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 3, '00000000-0000-0000-0000-0000000000e2', '')$$, 'P0001', 'insufficient_stars', 'trừ quá số dư');
select is((select count(*)::int from public.star_transactions), (select n from cnt), 'sổ không đổi sau lỗi');
select lives_ok($q$do $b$
declare d text;
begin
  perform public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a2']::uuid[], 3, null, 'x');
  raise exception 'no error';
exception when others then
  get stacked diagnostics d = pg_exception_detail;
  if sqlerrm <> 'insufficient_stars' or d not like '%00000000-0000-0000-0000-0000000000a1%' or d not like '%00000000-0000-0000-0000-0000000000a2%' or d not like '%,%' then
    raise exception 'sai: % / %', sqlerrm, d;
  end if;
end $b$$q$, 'insufficient_stars kèm detail danh sách học sinh');
select lives_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 2, null, 'Mất trật tự')$$, 'trừ đủ số dư');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'A1 available 0');

-- mã lỗi
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000b1']::uuid[], 1, null, 'x')$$, 'P0001', 'student_not_found', 'học sinh lớp khác');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a7']::uuid[], 1, null, 'x')$$, 'P0001', 'student_not_found', 'học sinh đã lưu trữ');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1', gen_random_uuid()]::uuid[], 1, null, 'x')$$, 'P0001', 'student_not_found', 'một id không tồn tại');
select throws_ok($$select public.award_stars('{}'::uuid[], 1, null, 'x')$$, 'P0001', 'no_students', 'mảng rỗng');
select throws_ok($$select public.award_stars(null, 1, null, 'x')$$, 'P0001', 'no_students', 'mảng null');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 0, null, 'x')$$, 'P0001', 'invalid_points', 'points 0');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 101, null, 'x')$$, 'P0001', 'invalid_points', 'points 101');
select throws_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 0, null, 'x')$$, 'P0001', 'invalid_points', 'trừ points 0');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, null, '   ')$$, 'P0001', 'reason_required', 'không tiêu chí, note rỗng');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, '00000000-0000-0000-0000-0000000000e2', '')$$, 'P0001', 'criterion_mismatch', 'cộng với tiêu chí trừ');
select throws_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, '00000000-0000-0000-0000-0000000000e1', '')$$, 'P0001', 'criterion_mismatch', 'trừ với tiêu chí cộng');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, '00000000-0000-0000-0000-0000000000e3', '')$$, 'P0001', 'criterion_mismatch', 'tiêu chí đã lưu trữ');
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, '00000000-0000-0000-0000-0000000000e4', '')$$, 'P0001', 'criterion_mismatch', 'tiêu chí lớp khác');
select throws_ok($$select public.reverse_batch(gen_random_uuid())$$, 'P0001', 'batch_not_found', 'batch không tồn tại');

-- hoàn tác
insert into batches select 'x3', public.award_stars(array['00000000-0000-0000-0000-0000000000a4']::uuid[], 2, '00000000-0000-0000-0000-0000000000e1', '');
insert into batches select 'r3', public.reverse_batch((select v from batches where k = 'x3'));
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a4'), 0, 'hoàn tác: A4 về 0');
select is((select count(*)::int from public.star_transactions where batch_id = (select v from batches where k = 'r3') and kind = 'reversal'), 1, 'batch reversal có 1 dòng');
select throws_ok($$select public.reverse_batch((select v from batches where k = 'x3'))$$, 'P0001', 'already_reversed', 'hoàn tác lần hai');
select throws_ok($$select public.reverse_batch((select v from batches where k = 'r3'))$$, 'P0001', 'already_reversed', 'hoàn tác bản ghi hoàn tác');

-- hoàn tác batch trừ luôn được
insert into batches select 'p1', public.penalize_stars(array['00000000-0000-0000-0000-0000000000a3']::uuid[], 1, null, 'Nói chuyện');
select lives_ok($$select public.reverse_batch((select v from batches where k = 'p1'))$$, 'hoàn tác batch trừ');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a3'), 1, 'A3 lấy lại 1 sao');

-- batch của lớp khác không thấy
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a1']::uuid[], 1, null, 'x')$$, 'P0001', 'student_not_found', 'T2 không cộng cho học sinh lớp A');
select throws_ok($$select public.reverse_batch((select v from batches where k = 'x1'))$$, 'P0001', 'batch_not_found', 'T2 không hoàn tác batch lớp A');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

-- Review Focus 1: trừ trước, hoàn tác sau
insert into batches select 'x5', public.award_stars(array['00000000-0000-0000-0000-0000000000a5']::uuid[], 5, '00000000-0000-0000-0000-0000000000e1', '');
select lives_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a5']::uuid[], 5, null, 'Phạt')$$, 'trừ 5 khi có 5');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a5'), 0, 'A5 available 0');
select throws_ok($$select public.reverse_batch((select v from batches where k = 'x5'))$$, 'P0001', 'insufficient_stars', 'hoàn tác cộng khi đã tiêu hết');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a5'), 0, 'A5 vẫn 0, không âm');
-- ngược thứ tự
insert into batches select 'x6', public.award_stars(array['00000000-0000-0000-0000-0000000000a6']::uuid[], 5, '00000000-0000-0000-0000-0000000000e1', '');
select lives_ok($$select public.reverse_batch((select v from batches where k = 'x6'))$$, 'hoàn tác trước');
select throws_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a6']::uuid[], 5, null, 'Phạt')$$, 'P0001', 'insufficient_stars', 'trừ sau khi đã hoàn tác');

-- audit
select ok(exists (select 1 from public.audit_logs where action = 'stars.award' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit stars.award');
select ok(exists (select 1 from public.audit_logs where action = 'stars.penalize' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit stars.penalize');
select ok(exists (select 1 from public.audit_logs where action = 'stars.reverse' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit stars.reverse');

reset role;
select ok(not has_function_privilege('anon', 'public.award_stars(uuid[],int,uuid,text)', 'execute'), 'anon không award_stars');
select ok(not has_function_privilege('anon', 'public.penalize_stars(uuid[],int,uuid,text)', 'execute'), 'anon không penalize_stars');
select ok(not has_function_privilege('anon', 'public.reverse_batch(uuid)', 'execute'), 'anon không reverse_batch');
select ok(has_function_privilege('authenticated', 'public.award_stars(uuid[],int,uuid,text)', 'execute')
  and has_function_privilege('authenticated', 'public.penalize_stars(uuid[],int,uuid,text)', 'execute')
  and has_function_privilege('authenticated', 'public.reverse_batch(uuid)', 'execute'), 'authenticated có EXECUTE');

-- sổ chỉ ghi thêm (chạy bằng postgres, bỏ qua RLS)
select throws_ok($$update public.star_transactions set note = 'sửa'$$, 'P0001', 'ledger_immutable', 'UPDATE sổ bị chặn');
select throws_ok($$delete from public.star_transactions$$, 'P0001', 'ledger_immutable', 'DELETE sổ bị chặn');

select * from finish();
rollback;
