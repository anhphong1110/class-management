begin;
select plan(48);

insert into public.classes (id, class_name, term1_start, term1_end, term2_start, term2_end) values
  ('00000000-0000-0000-0000-0000000000c1', '5A', '2026-09-05', '2027-01-15', '2027-01-18', '2027-05-31'),
  ('00000000-0000-0000-0000-0000000000c2', '5B', null, null, null, null);
insert into public.class_settings (class_id) values
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'), ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3 lưu trữ', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2');
insert into public.missions (id, class_id, name, period, reward_stars, active) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'M1', 'week', 3, true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'M2', 'month', 0, true),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c1', 'M3 tạm dừng', 'week', 2, false),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000c2', 'M4 lớp B', 'week', 2, true);
insert into public.badges (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'H1'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c2', 'H2 lớp B');

create temp table keys (k text primary key, v text);
grant all on keys to authenticated;
insert into keys select 'week', private.mission_period_key('week', now(), '00000000-0000-0000-0000-0000000000c1');

-- ===== khóa kỳ =====
select is((select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e
            where e.enumtypid = 'public.mission_period'::regtype), array['week', 'month', 'day', 'term'], 'enum mission_period có day và term');
select is(private.mission_period_key('day', '2026-10-31T16:30:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-10-31', 'day: 23:30 thứ Bảy VN');
select is(private.mission_period_key('day', '2026-10-31T17:10:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-11-01', 'day: 00:10 VN ngày 1/11 (UTC còn 31/10)');
select is(private.mission_period_key('week', '2026-10-31T16:30:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-W44', 'week: thứ Bảy 23:30 VN');
select is(private.mission_period_key('week', '2026-11-01T16:30:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-W44', 'week: Chủ nhật 23:30 VN vẫn cùng tuần');
select is(private.mission_period_key('week', '2026-11-01T17:10:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-W45', 'week: thứ Hai 00:10 VN sang tuần mới');
select is(private.mission_period_key('month', '2026-10-31T17:10:00Z', '00000000-0000-0000-0000-0000000000c1'), '2026-11', 'month: 00:10 VN ngày 1/11');
select is(private.mission_period_key('term', '2026-11-10T00:00:00Z', '00000000-0000-0000-0000-0000000000c1'), 'T1-2026-2027', 'term 1');
select is(private.mission_period_key('term', '2027-01-17T16:59:00Z', '00000000-0000-0000-0000-0000000000c1'), 'T1-2026-2027', 'term: trước 0h ngày 18/1 VN vẫn học kỳ 1');
select is(private.mission_period_key('term', '2027-01-17T17:00:00Z', '00000000-0000-0000-0000-0000000000c1'), 'T2-2026-2027', 'term 2');
select ok(not has_function_privilege('authenticated', 'private.mission_period_key(public.mission_period,timestamptz,uuid)', 'execute'), 'authenticated không EXECUTE mission_period_key');

-- ===== giáo viên cô T =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận M1 cho A1');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'có một dòng hoàn thành');
select is((select period_key from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'),
          (select v from keys where k = 'week'), 'period_key là khóa tuần hiện tại');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 3, 'A1 được cộng 3 sao');
select is((select t.delta from public.mission_completions c join public.star_transactions t on t.id = c.star_transaction_id
            where c.student_id = '00000000-0000-0000-0000-0000000000a1'), 3, 'star_transaction_id trỏ đúng giao dịch +3');
select is((select t.note from public.mission_completions c join public.star_transactions t on t.id = c.star_transaction_id
            where c.student_id = '00000000-0000-0000-0000-0000000000a1'), 'Nhiệm vụ: M1', 'ghi chú giao dịch');
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1')$$,
                 'P0001', 'already_completed', 'ghi nhận lần hai trong kỳ: already_completed');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 3, 'không cộng sao hai lần');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 1, 'vẫn một dòng hoàn thành');

-- Sang kỳ mới thì ghi lại được
reset role;
update public.mission_completions set period_key = '2020-W01' where student_id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1')$$, 'sang kỳ mới ghi nhận lại được');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 2, 'hai dòng hoàn thành ở hai kỳ');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 6, 'A1 có 6 sao');

-- Nhiệm vụ không thưởng sao
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a2')$$, 'M2 không thưởng sao');
select is((select star_transaction_id from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a2'), null, 'không có star_transaction_id');
select is((select count(*)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'A2 không có dòng sổ sao');

-- Các lỗi
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000a2')$$,
                 'P0001', 'not_allowed', 'nhiệm vụ tạm dừng: not_allowed');
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000a2')$$,
                 'P0001', 'mission_not_found', 'nhiệm vụ lớp khác');
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000b1')$$,
                 'P0001', 'student_not_found', 'học sinh lớp khác');
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3')$$,
                 'P0001', 'student_not_found', 'học sinh đã lưu trữ');

-- Huy hiệu
select lives_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2')$$, 'trao H1 cho A2');
select is((select awarded_by from public.student_badges where student_id = '00000000-0000-0000-0000-0000000000a2'),
          '00000000-0000-0000-0000-0000000000d1'::uuid, 'awarded_by là cô T');
select is((select count(*)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'), 0, 'huy hiệu không cộng sao');
select throws_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2')$$,
                 'P0001', 'already_awarded', 'trao lần hai: already_awarded');
select throws_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a2')$$,
                 'P0001', 'badge_not_found', 'huy hiệu lớp khác');
select throws_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1')$$,
                 'P0001', 'student_not_found', 'trao cho học sinh lớp khác');

-- Nhật ký
select is((select count(*)::int from public.audit_logs where action = 'missions.complete'), 3, 'audit missions.complete ghi 3 lần');
select is((select count(*)::int from public.audit_logs where action = 'badges.award'), 1, 'audit badges.award ghi 1 lần');

-- ===== học sinh =====
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d3', 'role', 'authenticated')::text, true);
select throws_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1')$$,
                 'P0001', 'not_allowed', 'học sinh gọi complete_mission: not_allowed');
select throws_ok($$select public.award_badge('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1')$$,
                 'P0001', 'not_allowed', 'học sinh gọi award_badge: not_allowed');
select is((select count(*)::int from public.mission_completions), 2, 'A1 chỉ đọc hai dòng hoàn thành của mình');
select is((select count(*)::int from public.mission_completions where student_id <> '00000000-0000-0000-0000-0000000000a1'), 0, 'A1 không đọc dòng của A2');
select is((select count(*)::int from public.student_badges), 0, 'A1 không đọc huy hiệu của A2');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.student_badges), 1, 'A2 đọc huy hiệu của mình');
select is((select count(*)::int from public.mission_completions), 1, 'A2 chỉ đọc một dòng hoàn thành của mình');
reset role;
update public.class_settings set feature_missions = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d4', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.mission_completions), 0, 'feature_missions tắt: học sinh không đọc hoàn thành nhiệm vụ');

-- ===== quyền hàm =====
reset role;
select ok(not has_function_privilege('anon', 'public.complete_mission(uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.award_badge(uuid,uuid)', 'execute')
  and not has_function_privilege('public', 'public.complete_mission(uuid,uuid)', 'execute')
  and not has_function_privilege('public', 'public.award_badge(uuid,uuid)', 'execute'), 'anon và PUBLIC không EXECUTE');
select ok(has_function_privilege('authenticated', 'public.complete_mission(uuid,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.award_badge(uuid,uuid)', 'execute'), 'authenticated có EXECUTE');

select * from finish();
rollback;
