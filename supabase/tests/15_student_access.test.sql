begin;
select plan(52);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id, feature_rewards, student_can_view_rewards, student_can_view_news, student_can_view_rank)
values ('00000000-0000-0000-0000-0000000000c1', true, true, true, true), ('00000000-0000-0000-0000-0000000000c2', true, true, true, true);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local'), ('00000000-0000-0000-0000-0000000000d5', 'b1@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3', null),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000c1', 'HS05', 5, 'A5', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c2', 'student', 'hs.b1', 'B1', '00000000-0000-0000-0000-0000000000b1');

insert into public.rewards (id, class_id, name, cost, stock, hidden, image_path, icon) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Bút', 5, 2, false, '00000000-0000-0000-0000-0000000000c1/rewards/but.png', 'pen'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Quà ẩn', 5, 1, true, '00000000-0000-0000-0000-0000000000c1/rewards/an.png', null),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c2', 'Quà lớp B', 5, 1, false, null, null);
-- A2 đang giữ 1 món Bút (pending); A1 từng đổi quà ẩn (đã giao); A2 có yêu cầu bị từ chối.
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 5, 'pending'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2', 5, 'delivered'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 5, 'rejected');
insert into public.announcements (id, class_id, title, image_path, archived_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Hiện', '00000000-0000-0000-0000-0000000000c1/announcements/hien.png', null),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'Đã lưu trữ', '00000000-0000-0000-0000-0000000000c1/announcements/cu.png', now());
insert into storage.objects (bucket_id, name) values
  ('class-media', '00000000-0000-0000-0000-0000000000c1/avatars/a.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/logo/l.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/cover/c.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/announcements/hien.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/announcements/cu.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/rewards/but.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/rewards/an.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c1/other/x.png'),
  ('class-media', '00000000-0000-0000-0000-0000000000c2/avatars/b.png');
insert into public.star_transactions (class_id, student_id, delta, kind, note, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 7, 'award', 'x', now(), gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 2, 'award', 'x', now() - interval '200 days', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 4, 'award', 'x', now(), gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a5', 50, 'award', 'x', now(), gen_random_uuid());
insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, created_at, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -3, 'reserve', '00000000-0000-0000-0000-0000000000e2', now(), gen_random_uuid());

create temp table cnt (n int);
grant all on cnt to authenticated;

-- Giáo viên: đọc mọi file lớp mình, không đọc lớp khác
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select count(*)::int from storage.objects where bucket_id = 'class-media'), 8, 'giáo viên đọc 8 file lớp mình (không lớp B)');
select is((select count(*)::int from public.leaderboard_between(null, null)), 3, 'giáo viên gọi leaderboard_between được');
select is((select count(*)::int from public.reward_availability()), 1, 'giáo viên: reward_availability chỉ quà không ẩn của lớp mình');

-- Học sinh A1
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select is((select array_agg(name order by name)::text from storage.objects where bucket_id = 'class-media'),
  '{00000000-0000-0000-0000-0000000000c1/announcements/hien.png,00000000-0000-0000-0000-0000000000c1/avatars/a.png,00000000-0000-0000-0000-0000000000c1/cover/c.png,00000000-0000-0000-0000-0000000000c1/logo/l.png,00000000-0000-0000-0000-0000000000c1/rewards/but.png}',
  'học sinh: avatar, logo, cover, ảnh thông báo hiện, ảnh quà không ẩn; không ảnh lưu trữ/quà ẩn/thư mục lạ/lớp khác');
select is((select count(*)::int from storage.objects where name like '%/announcements/cu.png'), 0, 'học sinh không đọc ảnh thông báo đã lưu trữ');
select is((select count(*)::int from storage.objects where name like '%/rewards/an.png'), 0, 'học sinh không đọc ảnh quà ẩn');

select is((select count(*)::int from public.reward_availability()), 1, 'học sinh: 1 món không ẩn');
select is((select left_count from public.reward_availability() where reward_id = '00000000-0000-0000-0000-0000000000f1'), 1, 'left_count = 2 - 1 đang giữ của bạn khác');
select is((select name || '/' || cost || '/' || icon from public.reward_availability() where reward_id = '00000000-0000-0000-0000-0000000000f1'), 'Bút/5/pen', 'reward_availability trả tên, giá, icon');
select is((select count(*)::int from public.reward_availability() where reward_id = '00000000-0000-0000-0000-0000000000f2'), 0, 'không trả quà ẩn');
select is((select count(*)::int from public.reward_availability() where reward_id = '00000000-0000-0000-0000-0000000000f3'), 0, 'không trả quà lớp khác');

select is((select count(*)::int from public.my_reward_requests()), 1, 'my_reward_requests: chỉ yêu cầu của chính em');
select is((select reward_name from public.my_reward_requests()), 'Quà ẩn', 'lấy tên cả khi quà đã ẩn');
select is((select status::text from public.my_reward_requests()), 'delivered', 'trạng thái đúng');

-- leaderboard
select throws_ok($$select * from public.leaderboard_between(null, null)$$, 'P0001', 'not_allowed', 'học sinh gọi leaderboard_between: not_allowed');
select is((select count(*)::int from public.leaderboard_for_period('year')), 3, 'leaderboard_for_period: 3 học sinh đang học lớp A');
select is((select stars from public.leaderboard_for_period('year') where student_id = '00000000-0000-0000-0000-0000000000a1'), 9, 'cả năm: reserve không tính (7+2)');
select is((select stars from public.leaderboard_for_period('week') where student_id = '00000000-0000-0000-0000-0000000000a1'), 7, 'tuần này: 7');
select is((select count(*)::int from public.leaderboard_for_period('year') where student_id in ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000b1')), 0, 'không có học sinh lưu trữ hay lớp khác');
select throws_ok($$select * from public.leaderboard_for_period('decade')$$, 'P0001', 'invalid_input', 'kỳ lạ: invalid_input');

-- my_profile_summary
select is((select competition_stars from public.my_profile_summary()), 9, 'my_profile_summary: sao thi đua 9');
select is((select available_stars from public.my_profile_summary()), 6, 'sao khả dụng 6 (trừ giữ 3)');
select is((select rank_year from public.my_profile_summary()), 1, 'hạng năm 1');
select is((select class_size from public.my_profile_summary()), 3, 'sĩ số 3 (không tính lưu trữ)');
select is((select full_name from public.my_profile_summary()), 'A1', 'tên');

-- A2: chỉ thấy yêu cầu của mình
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.my_reward_requests()), 2, 'A2 thấy 2 yêu cầu của mình, không thấy của A1');
select is((select left_count from public.reward_availability() where reward_id = '00000000-0000-0000-0000-0000000000f1'), 1, 'A2 cũng thấy còn 1');

-- B1 (lớp B): chỉ thấy dữ liệu lớp B
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d5', 'role', 'authenticated')::text, true);
select is((select array_agg(name)::text from storage.objects where bucket_id = 'class-media'), '{00000000-0000-0000-0000-0000000000c2/avatars/b.png}', 'B1: chỉ đọc file lớp B');
select is((select count(*)::int from storage.objects where name like '00000000-0000-0000-0000-0000000000c1/%'), 0, 'B1: không đọc file lớp A');
select is((select array_agg(reward_id)::text from public.reward_availability()), '{00000000-0000-0000-0000-0000000000f3}', 'B1: reward_availability chỉ quà lớp B');
select is((select array_agg(student_id)::text from public.leaderboard_for_period('year')), '{00000000-0000-0000-0000-0000000000b1}', 'B1: leaderboard_for_period chỉ học sinh lớp B');
select is((select count(*)::int from public.my_reward_requests()), 0, 'B1: không thấy yêu cầu lớp A');

-- Giáo viên gọi hàm học sinh
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.my_reward_requests()), 0, 'giáo viên: my_reward_requests rỗng');
select is((select count(*)::int from public.my_profile_summary()), 0, 'giáo viên: my_profile_summary rỗng');

-- Tắt cờ
reset role;
update public.class_settings set student_can_view_news = false, student_can_view_rank = false, student_can_view_rewards = false
 where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select is((select count(*)::int from storage.objects where name like '%/announcements/hien.png'), 0, 'tắt tin tức: không đọc ảnh thông báo');
select is((select count(*)::int from storage.objects where name like '%/rewards/but.png'), 0, 'tắt quà: không đọc ảnh quà');
select is((select count(*)::int from storage.objects where name like '%/avatars/a.png'), 1, 'vẫn đọc avatar');
select is((select count(*)::int from public.reward_availability()), 0, 'tắt quà: reward_availability rỗng');
select is((select count(*)::int from public.leaderboard_for_period('year')), 0, 'tắt xếp hạng: 0 dòng');
select is((select rank_year from public.my_profile_summary()), null, 'tắt xếp hạng: rank_year null');

-- Kỳ học kỳ: không có ngày -> cả năm; chỉ có học kỳ 1 -> học kỳ 1; đã tới học kỳ 2 -> học kỳ 2.
reset role;
update public.class_settings set student_can_view_rank = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select stars from public.leaderboard_for_period('term') where student_id = '00000000-0000-0000-0000-0000000000a1'), 9, 'học kỳ không có ngày: cả năm');
reset role;
update public.classes set term1_start = current_date - 300, term1_end = current_date - 250 where id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select stars from public.leaderboard_for_period('term') where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'chỉ có học kỳ 1 (đã qua): chỉ tính trong học kỳ 1');
reset role;
update public.classes set term2_start = current_date - 1, term2_end = current_date + 100 where id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select stars from public.leaderboard_for_period('term') where student_id = '00000000-0000-0000-0000-0000000000a1'), 7, 'đã tới học kỳ 2: tính học kỳ 2 (giao dịch hôm nay)');
select is((select stars from public.leaderboard_for_period('month') where student_id = '00000000-0000-0000-0000-0000000000a1'), 7, 'tháng này: 7');

-- Giáo viên: leaderboard_for_period('week') khớp leaderboard_between cùng mốc tuần
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.leaderboard_for_period('week')), 3, 'giáo viên: kỳ tuần có 3 dòng');
select is((select count(*)::int from (
  (select * from public.leaderboard_for_period('week')
   except select * from public.leaderboard_between(
     date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh',
     (date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') + interval '7 days') at time zone 'Asia/Ho_Chi_Minh'))
  union all
  (select * from public.leaderboard_between(
     date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh',
     (date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') + interval '7 days') at time zone 'Asia/Ho_Chi_Minh')
   except select * from public.leaderboard_for_period('week'))) d), 0, 'for_period(week) = between(mốc tuần): các dòng bằng nhau');

-- feature_rewards tắt: học sinh không đọc ảnh quà dù student_can_view_rewards bật
reset role;
update public.class_settings set feature_rewards = false, student_can_view_rewards = true
 where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select is((select count(*)::int from storage.objects where name like '%/rewards/but.png'), 0, 'feature_rewards tắt: không đọc ảnh quà');
reset role;
update public.class_settings set feature_rewards = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select is((select count(*)::int from storage.objects where name like '%/rewards/but.png'), 1, 'feature_rewards bật lại: đọc được ảnh quà');
reset role;
select ok(not has_function_privilege('authenticated', 'private.leaderboard_core(timestamptz,timestamptz)', 'execute'), 'authenticated không EXECUTE private.leaderboard_core');
select ok(not has_function_privilege('anon', 'public.leaderboard_between(timestamptz,timestamptz)', 'execute'), 'anon không EXECUTE leaderboard_between');
select ok(not has_function_privilege('public', 'private.leaderboard_core(timestamptz,timestamptz)', 'execute'), 'PUBLIC không EXECUTE private.leaderboard_core');

-- anon không có EXECUTE
reset role;
select ok(not has_function_privilege('anon', 'public.reward_availability()', 'execute')
  and not has_function_privilege('anon', 'public.my_reward_requests()', 'execute')
  and not has_function_privilege('anon', 'public.leaderboard_for_period(text)', 'execute')
  and not has_function_privilege('anon', 'public.my_profile_summary()', 'execute'), 'anon không EXECUTE hàm nào');

select * from finish();
rollback;
