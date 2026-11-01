begin;
select plan(50);

insert into public.classes (id, class_name) values ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.class_settings (class_id, feature_rewards, student_can_view_rewards, student_can_view_rank, student_can_view_history, feature_missions)
values ('00000000-0000-0000-0000-0000000000c1', true, true, true, true, true),
       ('00000000-0000-0000-0000-0000000000c2', true, true, true, true, true)
on conflict (class_id) do update set feature_rewards = excluded.feature_rewards, student_can_view_rewards = excluded.student_can_view_rewards, student_can_view_rank = excluded.student_can_view_rank, student_can_view_history = excluded.student_can_view_history, feature_missions = excluded.feature_missions;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'), ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2');
insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 7, 'award', 'x', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 4, 'award', 'x', gen_random_uuid());
insert into public.rewards (id, class_id, name, cost, stock, hidden) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Bút', 5, 2, false);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 5, 'pending');
insert into public.missions (id, class_id, name, period, reward_stars, active) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'M1', 'week', 3, true);
insert into public.badges (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'H1'),
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c2', 'H2 lớp B');

-- ===== 1) học sinh đã lưu trữ mất quyền API =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.leaderboard_for_period('year')), 2, 'A2 còn học: bảng xếp hạng 2 dòng');
select is((select count(*)::int from public.v_leaderboard_public), 2, 'A2 còn học: v_leaderboard_public 2 dòng');
select is((select count(*)::int from public.reward_availability()), 1, 'A2 còn học: reward_availability 1 dòng');
select is((select count(*)::int from public.my_profile_summary()), 1, 'A2 còn học: my_profile_summary 1 dòng');
select is((select count(*)::int from public.v_my_star_history), 1, 'A2 còn học: v_my_star_history 1 dòng');
select is((select count(*)::int from public.students), 1, 'A2 còn học: đọc được dòng students của mình');

reset role;
select set_config('app.archive_student', 'on', true);
update public.students set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a2';
select set_config('app.archive_student', 'off', true);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.leaderboard_for_period('year')), 0, 'A2 đã lưu trữ: leaderboard_for_period 0 dòng');
select is((select count(*)::int from public.v_leaderboard_public), 0, 'A2 đã lưu trữ: v_leaderboard_public 0 dòng');
select is((select count(*)::int from public.reward_availability()), 0, 'A2 đã lưu trữ: reward_availability 0 dòng');
select is((select count(*)::int from public.my_profile_summary()), 0, 'A2 đã lưu trữ: my_profile_summary 0 dòng');
select is((select count(*)::int from public.v_my_star_history), 0, 'A2 đã lưu trữ: v_my_star_history 0 dòng');
select is((select count(*)::int from public.students), 0, 'A2 đã lưu trữ: students 0 dòng');
select is((select count(*)::int from public.my_reward_requests()), 0, 'A2 đã lưu trữ: my_reward_requests 0 dòng');
select throws_ok($$select public.request_reward('00000000-0000-0000-0000-0000000000f1')$$, 'P0001', 'not_allowed', 'A2 đã lưu trữ: request_reward not_allowed');

reset role;
select set_config('app.archive_student', 'on', true);
update public.students set archived_at = null where id = '00000000-0000-0000-0000-0000000000a2';
select set_config('app.archive_student', 'off', true);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.leaderboard_for_period('year')), 2, 'bỏ lưu trữ: bảng xếp hạng trở lại');
select is((select count(*)::int from public.my_profile_summary()), 1, 'bỏ lưu trữ: my_profile_summary trở lại');
select is((select count(*)::int from public.students), 1, 'bỏ lưu trữ: students trở lại');

-- Giáo viên không đổi
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select is((select private.my_class_id()), '00000000-0000-0000-0000-0000000000c1'::uuid, 'giáo viên vẫn có my_class_id');
select is((select count(*)::int from public.leaderboard_for_period('year')), 2, 'giáo viên vẫn thấy bảng xếp hạng');

-- ===== 3) roll_no =====
select is((select count(*)::int from public.leaderboard_for_period('year') where roll_no is not null), 2, 'giáo viên nhận roll_no');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.leaderboard_for_period('year') where roll_no is null and student_id is not null), 2, 'học sinh: roll_no null, vẫn có student_id');
select is((select count(*)::int from public.leaderboard_for_period('year') where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'học sinh vẫn thấy dòng của mình');

-- ===== 4) cờ feature_rewards =====
select is((select count(*)::int from public.rewards), 1, 'feature_rewards bật: học sinh đọc rewards');
select is((select count(*)::int from public.reward_requests where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'A1 chưa có yêu cầu nào');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.reward_requests), 1, 'feature_rewards bật: A2 đọc reward_requests của mình');
select is((select count(*)::int from public.my_reward_requests()), 1, 'feature_rewards bật: my_reward_requests 1 dòng');
reset role;
update public.class_settings set feature_rewards = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.rewards), 0, 'feature_rewards tắt: học sinh không đọc rewards');
select is((select count(*)::int from public.reward_requests), 0, 'feature_rewards tắt: học sinh không đọc reward_requests');
select is((select count(*)::int from public.my_reward_requests()), 0, 'feature_rewards tắt: my_reward_requests 0 dòng');
reset role;
update public.class_settings set feature_rewards = true where class_id = '00000000-0000-0000-0000-0000000000c1';

-- ===== 2a) hoàn tác batch nhiệm vụ xóa dòng hoàn thành =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận M1 cho A1');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a2')$$, 'ghi nhận M1 cho A2');
select lives_ok($$select public.reverse_batch((select t.batch_id from public.mission_completions c
  join public.star_transactions t on t.id = c.star_transaction_id where c.student_id = '00000000-0000-0000-0000-0000000000a1'))$$,
  'hoàn tác batch của A1');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'dòng hoàn thành của A1 đã bị xóa');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'dòng hoàn thành của A2 còn nguyên');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 7, 'sao của A1 về như cũ');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận lại A1 trong cùng kỳ thành công');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'A1 có lại một dòng hoàn thành');

-- ===== 2b) thu hồi huy hiệu =====
select lives_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1')$$, 'trao H1 cho A1');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2')$$,
                 'P0001', 'not_allowed', 'học sinh không gọi được revoke_badge');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d2', 'role', 'authenticated')::text, true);
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2')$$,
                 'P0001', 'student_not_found', 'giáo viên lớp khác: student_not_found');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e3')$$,
                 'P0001', 'badge_not_awarded', 'huy hiệu lớp khác: badge_not_awarded');
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e2')$$,
                 'P0001', 'student_not_found', 'học sinh lớp khác: student_not_found');
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e2')$$,
                 'P0001', 'badge_not_awarded', 'bạn chưa có huy hiệu: badge_not_awarded');
select lives_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2')$$, 'thu hồi H1 của A1');
select is((select count(*)::int from public.student_badges where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'A1 không còn huy hiệu');
select throws_ok($$select public.revoke_badge('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e2')$$,
                 'P0001', 'badge_not_awarded', 'thu hồi lần hai: badge_not_awarded');
select is((select count(*)::int from public.audit_logs where action = 'badges.revoke'), 1, 'audit badges.revoke ghi một lần');
select lives_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1')$$, 'trao lại được sau khi thu hồi');

reset role;
select ok(not has_function_privilege('anon', 'public.revoke_badge(uuid,uuid)', 'execute')
  and not has_function_privilege('public', 'public.revoke_badge(uuid,uuid)', 'execute'), 'anon và PUBLIC không EXECUTE revoke_badge');
select ok(has_function_privilege('authenticated', 'public.revoke_badge(uuid,uuid)', 'execute'), 'authenticated có EXECUTE revoke_badge');

select * from finish();
rollback;
