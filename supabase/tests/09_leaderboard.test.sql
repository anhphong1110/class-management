begin;
select plan(28);

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
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000c1', 'HS06', 6, 'A6', null),
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c1', 'HS07', 7, 'A7', null),
  ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000c1', 'HS08', 8, 'A8', null),
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000c1', 'HS09', 9, 'A9', null),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1');
insert into public.rewards (id, class_id, name, cost) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Quà', 2);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000f1', 2);

-- Giao dịch có created_at tường minh. Kỳ: [2026-10-25 17:00Z, 2026-11-01 17:00Z)
insert into public.star_transactions (class_id, student_id, delta, kind, note, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 5, 'award', 'x', '2026-10-31 16:30:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 9, 'award', 'x', '2026-11-01 17:10:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 5, 'award', 'x', '2026-10-28 03:00:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 2, 'award', 'x', '2026-10-26 03:00:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 50, 'award', 'x', '2026-10-28 03:00:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', 50, 'award', 'x', '2026-10-28 03:00:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a6', 4, 'award', 'x', '2026-10-28 03:00:00+00', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a6', 3, 'award', 'x', '2026-10-20 03:00:00+00', gen_random_uuid());
insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a6', -2, 'reserve', '00000000-0000-0000-0000-0000000000f2', '2026-10-29 03:00:00+00', gen_random_uuid());
-- a6: reserve không tính vào xếp hạng. Một batch chỉ có dòng reserve, cho test batch_not_found.
insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a9', -2, 'reserve', '00000000-0000-0000-0000-0000000000f2', '2026-10-29 03:00:00+00', '00000000-0000-0000-0000-0000000000ba');
-- a4: hoàn tác trong kỳ (award + reversal) -> 0
insert into public.star_transactions (id, class_id, student_id, delta, kind, note, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', 2, 'award', 'x', '2026-10-27 03:00:00+00', gen_random_uuid());
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4', -2, 'reversal', '00000000-0000-0000-0000-0000000000aa', '2026-10-27 04:00:00+00', gen_random_uuid());

create temp table batches (k text primary key, v uuid);
grant all on batches to authenticated;
create temp table cnt (n int);
grant all on cnt to authenticated;

-- cô T
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

select is((select count(*)::int from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00')), 8, 'kỳ: 8 học sinh lớp A đang học (không lưu trữ, không lớp B)');
select is((select stars from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a1'), 5, '16:30Z thứ Bảy tính vào tuần, 17:10Z Chủ nhật thì không');
select is((select stars from public.leaderboard_between('2026-11-01 17:00:00+00', null) where student_id = '00000000-0000-0000-0000-0000000000a1'), 9, 'tuần mới có giao dịch 17:10Z');
select is((select stars from public.leaderboard_between(null, '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a6'), 7, 'p_from null: tính từ đầu; reserve không tính');
select is((select stars from public.leaderboard_between(null, null) where student_id = '00000000-0000-0000-0000-0000000000a1'), 14, 'cả hai null: toàn bộ');
select is((select stars from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a4'), 0, 'cộng rồi hoàn tác trong kỳ: 0');
select is((select stars from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a7'), 0, 'không giao dịch: 0');
select is((select rank from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'A1 hạng 1');
select is((select rank from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'A2 đồng hạng 1');
select is((select rank from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00') where student_id = '00000000-0000-0000-0000-0000000000a6'), 3, 'người kế tiếp hạng 3');
select is((select array_agg(roll_no order by stars desc, roll_no) from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00'))::text,
  (select array_agg(roll_no)::text from public.leaderboard_between('2026-10-25 17:00:00+00', '2026-11-01 17:00:00+00')), 'sắp stars desc, roll_no asc');
select is((select count(*)::int from public.leaderboard_between(null, null) where student_id in ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b1')), 0, 'không có học sinh lưu trữ hay lớp B');

-- vai học sinh
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
reset role;
update public.class_settings set student_can_view_rank = false, student_can_view_history = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select count(*)::int from public.leaderboard_between(null, null)), 0, 'học sinh, cờ xếp hạng tắt: 0 dòng');
select is((select count(*)::int from public.v_leaderboard_public), 0, 'v_leaderboard_public: cờ tắt 0 dòng');
select is((select count(*)::int from public.v_my_star_history), 0, 'v_my_star_history: cờ tắt 0 dòng');
reset role;
update public.class_settings set student_can_view_rank = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select count(*)::int from public.leaderboard_between(null, null)), 8, 'học sinh, cờ bật: đủ 8 dòng lớp A đang học');
select is(pg_get_function_result('public.leaderboard_between(timestamptz,timestamptz)'::regprocedure),
  'TABLE(student_id uuid, full_name text, avatar_id uuid, roll_no integer, stars integer, rank integer)', 'không có cột ghi chú');
select is((select count(*)::int from public.v_leaderboard_public), 8, 'v_leaderboard_public: cờ bật đủ dòng');
select is((select count(*)::int from public.v_leaderboard_public where student_id in ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b1')), 0, 'view công khai không có học sinh lưu trữ/lớp khác');

-- v_student_stars: cộng 5 rồi hoàn tác
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
insert into batches select 'v1', public.award_stars(array['00000000-0000-0000-0000-0000000000a7']::uuid[], 5, null, 'Tốt');
select lives_ok($$select public.reverse_batch((select v from batches where k = 'v1'))$$, 'hoàn tác +5');
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a7'), 0, 'competition 0 sau hoàn tác');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a7'), 0, 'available 0 sau hoàn tác');

-- reverse_batch: batch chỉ có reserve
select throws_ok($$select public.reverse_batch('00000000-0000-0000-0000-0000000000ba')$$, 'P0001', 'batch_not_found', 'batch chỉ reserve: batch_not_found');

-- reverse_batch: batch nhiều học sinh, S3 đã bị trừ còn 1 sao
insert into batches select 'm1', public.award_stars(array['00000000-0000-0000-0000-0000000000a7','00000000-0000-0000-0000-0000000000a8']::uuid[], 3, null, 'Nhóm');
select lives_ok($$select public.penalize_stars(array['00000000-0000-0000-0000-0000000000a8']::uuid[], 2, null, 'Trừ')$$, 'trừ S3 còn 1');
insert into cnt select count(*) from public.star_transactions;
select lives_ok($q$do $b$
declare d text;
begin
  perform public.reverse_batch((select v from batches where k = 'm1'));
  raise exception 'no error';
exception when others then
  get stacked diagnostics d = pg_exception_detail;
  if sqlerrm <> 'insufficient_stars' or d is distinct from '00000000-0000-0000-0000-0000000000a8' then
    raise exception 'sai: % / %', sqlerrm, d;
  end if;
end $b$$q$, 'reverse_batch: insufficient_stars, detail chỉ có S3');
select is((select count(*)::int from public.star_transactions), (select n from cnt), 'sổ không đổi sau lỗi hoàn tác');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a7'), 3, 'S2 vẫn có 3 sao');

-- award_stars p_points null
select throws_ok($$select public.award_stars(array['00000000-0000-0000-0000-0000000000a7']::uuid[], null, null, 'x')$$, 'P0001', 'invalid_points', 'points null: invalid_points');

select * from finish();
rollback;
