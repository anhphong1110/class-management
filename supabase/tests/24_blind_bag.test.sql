begin;
select plan(22);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A');
insert into public.class_settings (class_id, weekly_redeem_limit, feature_blind_bag) values
  ('00000000-0000-0000-0000-0000000000c1', 20, true)
  on conflict (class_id) do update set weekly_redeem_limit = 20, feature_blind_bag = true;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2');
-- cost 10 / 30 / 50 (trung bình 30), Q4 bị ẩn, Q5 hết hàng
insert into public.rewards (id, class_id, name, cost, stock, hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Q1', 10, 1000, false),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Q2', 30, 1000, false),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c1', 'Q3', 50, 1000, false),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c1', 'Q4 ẩn', 5, 5, true),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', 'Q5 hết', 5, 0, false);
insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 100000, 'award', 'seed', gen_random_uuid());

-- ===== cô đặt túi =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.set_blind_bag_items(array[
  '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3',
  '00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f5']::uuid[])$$, 'cô đặt 5 món vào túi');
select is((select count(*)::int from public.rewards where in_blind_bag), 5, 'túi có 5 món');
select is((public.blind_bag_info() ->> 'price')::int, 30, 'giá = trung bình 10/30/50, bỏ món ẩn và hết hàng');
select is(jsonb_array_length(public.blind_bag_info() -> 'items'), 3, 'chỉ 3 món hợp lệ');
select throws_ok($$select public.set_blind_bag_items(array['00000000-0000-0000-0000-0000000000ff']::uuid[])$$, 'P0001', 'reward_not_found', 'món lạ bị từ chối');

-- ===== học sinh A1 =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_blind_bag_items('{}'::uuid[])$$, 'P0001', 'not_allowed', 'học sinh không đặt được túi');
select is((public.blind_bag_info() ->> 'enabled')::boolean, true, 'học sinh thấy túi đang bật');
select ok(not (public.blind_bag_info()::text like '%weight%' or public.blind_bag_info()::text like '%pct%'), 'info không lộ tỉ lệ');

create temp table opened (request_id uuid, reward uuid, auto bool);
grant all on opened to authenticated;
insert into opened select * from public.open_blind_bag();
select is((select count(*)::int from opened), 1, 'mở túi được 1 lần');
select is((select cost from public.reward_requests where id = (select request_id from opened)), 30, 'cost chốt bằng giá túi');
select is((select from_blind_bag from public.reward_requests where id = (select request_id from opened)), true, 'đánh dấu from_blind_bag');
select is((select status::text from public.reward_requests where id = (select request_id from opened)), 'pending', 'chờ cô duyệt');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 99970, 'giữ đúng 30 sao');
select ok((select reward from opened) in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3'), 'món bốc nằm trong túi hợp lệ');

-- ===== cô từ chối: hoàn đúng giá túi =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.reject_reward_request((select request_id from opened))$$, 'từ chối yêu cầu túi mù');
select is((select sum(delta)::int from public.star_transactions where reward_request_id = (select request_id from opened)), 0, 'hoàn đủ 30 sao');

-- ===== phân phối: món rẻ ra nhiều hơn món đắt (10 sao: 1/10 ; 50 sao: 1/50 => kỳ vọng 5:1) =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select count(*) from (select public.open_blind_bag() from generate_series(1, 20)) s;
reset role;
update public.reward_requests set created_at = created_at - interval '60 days' where from_blind_bag;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);

select ok((select count(*) from public.reward_requests where reward_id = '00000000-0000-0000-0000-0000000000f1' and from_blind_bag)
        > (select count(*) from public.reward_requests where reward_id = '00000000-0000-0000-0000-0000000000f3' and from_blind_bag) * 2,
  'quà 10 sao ra nhiều hơn quà 50 sao rõ rệt');

-- ===== học sinh A2 không có sao =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$select public.open_blind_bag()$$, 'P0001', 'insufficient_stars', 'thiếu sao thì không mở được');

-- ===== túi còn dưới 2 món hợp lệ =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select public.set_blind_bag_items(array['00000000-0000-0000-0000-0000000000f1']::uuid[]);
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.open_blind_bag()$$, 'P0001', 'blind_bag_unavailable', 'dưới 2 món thì không mở');
select is((public.blind_bag_info() ->> 'enabled')::boolean, false, 'info báo tắt khi dưới 2 món');

-- ===== tắt cờ =====
reset role;
update public.class_settings set feature_blind_bag = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.open_blind_bag()$$, 'P0001', 'not_allowed', 'tắt cờ thì not_allowed');
select is((public.blind_bag_info() ->> 'enabled')::boolean, false, 'info báo tắt khi tắt cờ');

select * from finish();
rollback;
