begin;
select plan(90);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id, weekly_redeem_limit) values
  ('00000000-0000-0000-0000-0000000000c1', 20), ('00000000-0000-0000-0000-0000000000c2', 20) on conflict (class_id) do update set weekly_redeem_limit = excluded.weekly_redeem_limit;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'), ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local'),
  ('00000000-0000-0000-0000-0000000000d5', 'b1@test.local'), ('00000000-0000-0000-0000-0000000000d6', 'a3@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c2', 'student', 'hs.b1', 'B1', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a3', 'A3', '00000000-0000-0000-0000-0000000000a3');
insert into public.rewards (id, class_id, name, cost, stock, hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Q1', 10, 1, false),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'Q2', 30, 5, false),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c1', 'Q3 ẩn', 5, 5, true),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c2', 'Q4 lớp B', 5, 5, false),
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', 'Q5', 1, 10, false);
insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 20, 'award', 'seed', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', 50, 'award', 'seed', gen_random_uuid());
insert into public.groups (id, class_id, name) values ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000c1', 'Tổ 1');
insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000a1', 'member');

create temp table reqs (k text primary key, v uuid);
grant all on reqs to authenticated;

-- ===== học sinh A1 =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
insert into reqs select 'r1', public.request_reward('00000000-0000-0000-0000-0000000000f1');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r1')), 'pending', 'A1 gửi yêu cầu: pending');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'A1 available 10 sau khi giữ');
select is((select competition_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 20, 'competition không đổi');
select is((select cost from public.reward_requests where id = (select v from reqs where k = 'r1')), 10, 'cost được chốt');

-- A2 không có sao nhưng quà đã bị giữ
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f1')$$, 'P0001', 'out_of_stock', 'đang giữ hết kho: out_of_stock');

-- ===== cô T duyệt =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.approve_reward_request((select v from reqs where k = 'r1'))$$, 'duyệt r1');
select is((select stock from public.rewards where id = '00000000-0000-0000-0000-0000000000f1'), 0, 'stock Q1 = 0');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'A1 available vẫn 10');
select is((select array_agg(kind::text order by kind::text) from public.star_transactions where reward_request_id = (select v from reqs where k = 'r1')),
  array['redeem', 'release', 'reserve'], 'đúng 3 dòng sổ');
select is((select count(*)::int from public.star_transactions where reward_request_id = (select v from reqs where k = 'r1')), 3, 'đếm 3 dòng');
select ok((select bool_and(batch_id is null) from public.star_transactions where reward_request_id = (select v from reqs where k = 'r1')), 'batch_id null');
select throws_ok($$select public.approve_reward_request((select v from reqs where k = 'r1'))$$, 'P0001', 'already_processed', 'duyệt lần hai');
select throws_ok($$select public.reject_reward_request((select v from reqs where k = 'r1'))$$, 'P0001', 'already_processed', 'từ chối sau duyệt');
select lives_ok($$select public.deliver_reward_request((select v from reqs where k = 'r1'))$$, 'giao r1');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r1')), 'delivered', 'status delivered');
select ok((select delivered_at is not null from public.reward_requests where id = (select v from reqs where k = 'r1')), 'delivered_at có giá trị');
select throws_ok($$select public.deliver_reward_request((select v from reqs where k = 'r1'))$$, 'P0001', 'already_processed', 'giao lần hai');

-- ===== A3: từ chối và giao khi pending =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d6', 'role', 'authenticated')::text, true);
insert into reqs select 'r2', public.request_reward('00000000-0000-0000-0000-0000000000f2');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a3')::int, 20, 'A3 available 20 khi giữ 30');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.deliver_reward_request((select v from reqs where k = 'r2'))$$, 'P0001', 'already_processed', 'giao khi còn pending');
select lives_ok($$select public.reject_reward_request((select v from reqs where k = 'r2'))$$, 'từ chối r2');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a3')::int, 50, 'A3 available trở lại 50');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r2')), 'rejected', 'status rejected');
select throws_ok($$select public.deliver_reward_request((select v from reqs where k = 'r2'))$$, 'P0001', 'already_processed', 'giao yêu cầu đã từ chối');
select throws_ok($$select public.reject_reward_request((select v from reqs where k = 'r2'))$$, 'P0001', 'already_processed', 'từ chối lần hai');

-- ===== only_enough =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'insufficient_stars', 'only_enough: A2 0 sao');
reset role;
update public.class_settings set only_enough = false, reserve_on_request = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
insert into reqs select 'r3', public.request_reward('00000000-0000-0000-0000-0000000000f2');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r3')), 'pending', 'tắt only_enough: gửi được');
select is((select count(*)::int from public.star_transactions where reward_request_id = (select v from reqs where k = 'r3')), 0, 'tắt reserve: không ghi sổ');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.approve_reward_request((select v from reqs where k = 'r3'))$$, 'P0001', 'insufficient_stars', 'duyệt khi không đủ sao');
select lives_ok($$select public.reject_reward_request((select v from reqs where k = 'r3'))$$, 'từ chối r3 không giữ sao');
select is((select count(*)::int from public.star_transactions where reward_request_id = (select v from reqs where k = 'r3')), 0, 'từ chối không giữ: không ghi release');
reset role;
update public.class_settings set only_enough = true, reserve_on_request = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;

-- reserve bật, only_enough tắt: vẫn không được giữ quá số dư
reset role;
update public.class_settings set only_enough = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f2')$$, 'P0001', 'insufficient_stars', 'reserve bật, only_enough tắt, 0 sao: insufficient_stars');
reset role;
select is((select count(*)::int from public.reward_requests where student_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'không ghi thêm yêu cầu nào');
select is((select count(*)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'không ghi dòng sổ nào');
update public.class_settings set only_enough = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;

-- ===== weekly_redeem_limit =====
reset role;
update public.class_settings set weekly_redeem_limit = 1 where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d6', 'role', 'authenticated')::text, true);
insert into reqs select 'r4', public.request_reward('00000000-0000-0000-0000-0000000000f5');
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f5')$$, 'P0001', 'weekly_limit', 'lượt thứ hai trong tuần');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select public.reject_reward_request((select v from reqs where k = 'r4'));
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d6', 'role', 'authenticated')::text, true);
insert into reqs select 'r5', public.request_reward('00000000-0000-0000-0000-0000000000f5');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r5')), 'pending', 'yêu cầu bị từ chối không tính vào giới hạn');
reset role;
update public.class_settings set weekly_redeem_limit = 20 where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;

-- ===== require_approval tắt =====
reset role;
update public.class_settings set require_approval = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d6', 'role', 'authenticated')::text, true);
insert into reqs select 'r6', public.request_reward('00000000-0000-0000-0000-0000000000f5');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r6')), 'approved', 'require_approval tắt: approved ngay');
select is((select stock from public.rewards where id = '00000000-0000-0000-0000-0000000000f5'), 9, 'stock Q5 giảm 1');
select ok((select decided_by is null from public.reward_requests where id = (select v from reqs where k = 'r6')), 'tự duyệt: decided_by null');
select ok((select decided_at is not null from public.reward_requests where id = (select v from reqs where k = 'r6')), 'tự duyệt: decided_at có giá trị');
reset role;
select is((select array_agg(kind::text order by kind::text) from public.star_transactions where reward_request_id = (select v from reqs where k = 'r6')),
  array['redeem', 'release', 'reserve'], 'tự duyệt ghi đủ 3 dòng');
update public.class_settings set require_approval = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;

-- ===== cờ, ẩn, vai, lớp khác =====
reset role;
update public.class_settings set feature_rewards = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f5')$$, 'P0001', 'not_allowed', 'feature_rewards tắt');
reset role;
update public.class_settings set feature_rewards = true, student_can_view_rewards = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f5')$$, 'P0001', 'not_allowed', 'student_can_view_rewards tắt');
reset role;
update public.class_settings set student_can_view_rewards = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f3')$$, 'P0001', 'reward_not_found', 'quà ẩn');
select throws_ok($$select public.request_reward(gen_random_uuid())$$, 'P0001', 'reward_not_found', 'quà không tồn tại');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d5', 'role', 'authenticated')::text, true);
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f5')$$, 'P0001', 'reward_not_found', 'quà lớp khác');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f5')$$, 'P0001', 'not_allowed', 'giáo viên không gửi yêu cầu');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.approve_reward_request((select v from reqs where k = 'r5'))$$, 'P0001', 'not_allowed', 'học sinh không duyệt');
select throws_ok($$select public.reject_reward_request((select v from reqs where k = 'r5'))$$, 'P0001', 'not_allowed', 'học sinh không từ chối');
select throws_ok($$select public.deliver_reward_request((select v from reqs where k = 'r5'))$$, 'P0001', 'not_allowed', 'học sinh không giao');
select throws_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000a3')$$, 'P0001', 'not_allowed', 'học sinh không lưu trữ');
select throws_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f5', 3)$$, 'P0001', 'not_allowed', 'học sinh không đặt tồn kho');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$select public.approve_reward_request((select v from reqs where k = 'r5'))$$, 'P0001', 'not_allowed', 'T2 không duyệt yêu cầu lớp A');
select throws_ok($$select public.reject_reward_request((select v from reqs where k = 'r5'))$$, 'P0001', 'not_allowed', 'T2 không từ chối yêu cầu lớp A');
select throws_ok($$select public.deliver_reward_request((select v from reqs where k = 'r1'))$$, 'P0001', 'not_allowed', 'T2 không giao yêu cầu lớp A');
select throws_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000a3')$$, 'P0001', 'student_not_found', 'T2 không lưu trữ học sinh lớp A');
select throws_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f5', 3)$$, 'P0001', 'reward_not_found', 'T2 không đặt tồn kho quà lớp A');

-- ===== set_reward_stock =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d6', 'role', 'authenticated')::text, true);
insert into reqs select 'r7', public.request_reward('00000000-0000-0000-0000-0000000000f2');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f2', 0)$$, 'P0001', 'stock_below_held', 'stock 0 khi có 1 pending');
select throws_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f2', -1)$$, 'P0001', 'stock_below_held', 'stock âm');
select lives_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f2', 1)$$, 'stock 1 bằng số giữ');
select is((select stock from public.rewards where id = '00000000-0000-0000-0000-0000000000f2'), 1, 'stock Q2 = 1');
select throws_ok($$select public.set_reward_stock(gen_random_uuid(), 1)$$, 'P0001', 'reward_not_found', 'quà không tồn tại');
select throws_ok($$update public.rewards set stock = 0 where id = '00000000-0000-0000-0000-0000000000f2'$$, '42501', null, 'giáo viên không UPDATE stock trực tiếp (quyền cột)');
reset role;
select throws_ok($$update public.rewards set stock = 0 where id = '00000000-0000-0000-0000-0000000000f2'$$, 'P0001', 'stock_below_held', 'UPDATE trực tiếp dưới số pending bị chặn (trigger)');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);

-- duyệt khi kho đã về 0 (bỏ qua trigger bằng quyền postgres)
reset role;
alter table public.rewards disable trigger rewards_stock_check;
update public.rewards set stock = 0 where id = '00000000-0000-0000-0000-0000000000f2';
alter table public.rewards enable trigger rewards_stock_check;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.approve_reward_request((select v from reqs where k = 'r7'))$$, 'P0001', 'out_of_stock', 'duyệt khi stock 0: out_of_stock');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r7')), 'pending', 'yêu cầu vẫn pending');
select is((select array_agg(kind::text) from public.star_transactions where reward_request_id = (select v from reqs where k = 'r7')), array['reserve'], 'không ghi thêm dòng sổ');

-- ===== lưu trữ học sinh =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
insert into reqs select 'r8', public.request_reward('00000000-0000-0000-0000-0000000000f5');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 9, 'A1 available 9 khi giữ 1');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000a1')$$, 'lưu trữ A1');
select is((select status::text from public.reward_requests where id = (select v from reqs where k = 'r8')), 'rejected', 'yêu cầu pending bị từ chối');
select is((select count(*)::int from public.star_transactions where reward_request_id = (select v from reqs where k = 'r8') and kind = 'release'), 1, 'có dòng release');
select ok((select archived_at is not null from public.students where id = '00000000-0000-0000-0000-0000000000a1'), 'archived_at có giá trị');
select is((select count(*)::int from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'rời group_members');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'sao giữ được trả lại');
select throws_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000a1')$$, 'P0001', 'student_not_found', 'lưu trữ lần hai');
select throws_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000b1')$$, 'P0001', 'student_not_found', 'học sinh lớp khác');

-- ===== trigger sổ =====
reset role;
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -1, 'reserve', (select v from reqs where k = 'r1'))$$,
  'P0001', 'reward_mismatch', 'reserve với yêu cầu của học sinh khác');
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 1, 'release', (select v from reqs where k = 'r1'))$$,
  'P0001', 'reward_mismatch', 'release với yêu cầu của học sinh khác');

-- ===== audit =====
select ok(exists (select 1 from public.audit_logs where action = 'rewards.request' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit rewards.request');
select ok(exists (select 1 from public.audit_logs where action = 'rewards.approve' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit rewards.approve');
select ok(exists (select 1 from public.audit_logs where action = 'rewards.reject' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit rewards.reject');
select ok(exists (select 1 from public.audit_logs where action = 'rewards.deliver' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit rewards.deliver');
select ok(exists (select 1 from public.audit_logs where action = 'rewards.stock' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit rewards.stock');
select ok(exists (select 1 from public.audit_logs where action = 'students.archive' and class_id = '00000000-0000-0000-0000-0000000000c1'), 'audit students.archive');

-- ===== quyền thực thi =====
select ok(not has_function_privilege('anon', 'public.request_reward(uuid)', 'execute'), 'anon không request_reward');
select ok(not has_function_privilege('anon', 'public.approve_reward_request(uuid)', 'execute'), 'anon không approve_reward_request');
select ok(not has_function_privilege('anon', 'public.reject_reward_request(uuid)', 'execute'), 'anon không reject_reward_request');
select ok(not has_function_privilege('anon', 'public.deliver_reward_request(uuid)', 'execute'), 'anon không deliver_reward_request');
select ok(not has_function_privilege('anon', 'public.archive_student(uuid)', 'execute'), 'anon không archive_student');
select ok(not has_function_privilege('anon', 'public.set_reward_stock(uuid,int)', 'execute'), 'anon không set_reward_stock');
select ok(has_function_privilege('authenticated', 'public.request_reward(uuid)', 'execute'), 'authenticated có request_reward');

select * from finish();
rollback;
