begin;
select plan(11);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A');
insert into public.class_settings (class_id) values ('00000000-0000-0000-0000-0000000000c1');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d2', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'b@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'Học sinh A'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'Học sinh B');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a', 'A', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.b', 'B', '00000000-0000-0000-0000-0000000000b1');
insert into public.star_criteria (id, class_id, label, kind) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Phát biểu tốt', 'award'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Nói chuyện riêng', 'penalty');
insert into public.rewards (id, class_id, name, cost, stock) values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000c1', 'Quà', 3, 5);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost) values
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000aa', 3);
insert into public.star_transactions (id, class_id, student_id, delta, kind, criterion_id, note, reward_request_id, batch_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 5, 'award', '00000000-0000-0000-0000-0000000000f1', null, null, gen_random_uuid()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'penalty', '00000000-0000-0000-0000-0000000000f2', 'Nói chuyện riêng', null, gen_random_uuid()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -3, 'reserve', null, null, '00000000-0000-0000-0000-0000000000bb', gen_random_uuid()),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 4, 'award', null, null, null, gen_random_uuid());

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 3, 'A: sao thi đua = 3');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'A: sao khả dụng = 0');

reset role;
insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 2, 'reversal', '00000000-0000-0000-0000-000000000102', gen_random_uuid());

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 5, 'sau hoàn tác: sao thi đua = 5');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1'), 2, 'sau hoàn tác: sao khả dụng = 2');

select is((select count(*)::int from public.v_leaderboard_public), 2, 'bảng xếp hạng công khai có 2 học sinh');
select is((select competition_stars from public.v_leaderboard_public where student_id = '00000000-0000-0000-0000-0000000000b1'), 4, 'A thấy sao thi đua của B');
select columns_are('public', 'v_leaderboard_public', array['class_id','student_id','full_name','avatar_id','competition_stars'], 'bảng xếp hạng không có cột ghi chú');
select is((select count(*)::int from public.v_my_star_history), 4, 'lịch sử của A chỉ có 4 dòng của A');
select is((select count(*)::int from public.v_my_star_history where student_id <> '00000000-0000-0000-0000-0000000000a1'), 0, 'lịch sử không có dòng của bạn khác');
select is((select string_agg(label, '|' order by kind) from public.v_my_star_history where kind in ('penalty', 'reversal')), 'Trừ sao|Trừ sao', 'penalty và reversal của penalty có nhãn Trừ sao');
select is((select label from public.v_my_star_history where kind = 'award'), 'Phát biểu tốt', 'award lấy nhãn từ tiêu chí');

select * from finish();
rollback;
