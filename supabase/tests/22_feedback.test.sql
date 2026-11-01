begin;
select plan(45);

create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;

-- ===== dữ liệu mẫu =====
insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Năm 8 (5/8)'),
  ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'),
  ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'),
  ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local');
insert into public.avatar_library (id, class_id, kind, preset, image_path, label) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'preset', '{}', null, 'Preset'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'upload', null,
   '00000000-0000-0000-0000-0000000000c1/avatars/x.png', 'Ảnh tải lên'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000c2', 'upload', null,
   '00000000-0000-0000-0000-0000000000c2/avatars/y.png', 'Ảnh lớp khác');
insert into public.students (id, class_id, code, roll_no, full_name, avatar_id, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', '00000000-0000-0000-0000-0000000000f2', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null, null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3 chưa có tài khoản', null, null),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null, null);
insert into public.profiles (id, class_id, role, username, display_name, student_id, avatar_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null, '00000000-0000-0000-0000-0000000000f2'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null, null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1', null),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2', null);
insert into public.groups (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Tổ 1');
insert into public.group_members (class_id, group_id, student_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a2');
insert into public.attendance (class_id, student_id, date, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '2026-09-10', 'present'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '2026-09-10', 'present');
insert into public.missions (id, class_id, name, period, reward_stars, active) values
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'M1', 'week', 0, true);
insert into public.mission_completions (class_id, mission_id, student_id, period_key) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', '2026-W37');
insert into public.badges (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', 'Huy hiệu');
insert into public.student_badges (class_id, badge_id, student_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000a1');
insert into public.rewards (id, class_id, name, cost, stock, image_path) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', 'Bút đã có người đổi', 5, 3, null),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000c1', 'Thước chưa ai đổi', 4, 3,
   '00000000-0000-0000-0000-0000000000c1/rewards/r.png'),
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000c2', 'Quà lớp khác', 4, 3, null);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000f5', 5, 'pending');
insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id, reward_request_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 9, 'award', 'x', gen_random_uuid(), null),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -5, 'reserve', 'giữ sao', null,
   '00000000-0000-0000-0000-0000000000e4'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 4, 'award', 'x', gen_random_uuid(), null);

-- ===== xóa học sinh =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select public.delete_student('00000000-0000-0000-0000-0000000000a2')$$,
  'P0001', 'not_allowed', 'học sinh không xóa được học sinh');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select throws_ok($$select public.delete_student('00000000-0000-0000-0000-0000000000a1')$$,
  'P0001', 'student_not_found', 'giáo viên lớp khác không xóa được');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.delete_student('00000000-0000-0000-0000-0000000000ff')$$,
  'P0001', 'student_not_found', 'học sinh không tồn tại');
select is(public.delete_student('00000000-0000-0000-0000-0000000000a1'),
  array['00000000-0000-0000-0000-0000000000d3']::uuid[], 'xóa học sinh có tài khoản trả về id tài khoản Auth');
reset role;
select is((select count(*)::int from public.students where id = '00000000-0000-0000-0000-0000000000a1'), 0, 'học sinh đã mất');
select is((select count(*)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'sổ sao của học sinh đã mất');
select is((select count(*)::int from public.reward_requests where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'yêu cầu quà đã mất');
select is((select count(*)::int from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'điểm danh đã mất');
select is((select count(*)::int from public.group_members where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'thành viên tổ đã mất');
select is((select count(*)::int from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'nhiệm vụ đã hoàn thành đã mất');
select is((select count(*)::int from public.student_badges where student_id = '00000000-0000-0000-0000-0000000000a1'), 0, 'huy hiệu đã mất');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000d3'), 0, 'hồ sơ đăng nhập đã mất');
select is((select count(*)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'), 1, 'sổ sao học sinh khác còn nguyên');
select is((select count(*)::int from public.students where class_id = '00000000-0000-0000-0000-0000000000c1'), 2, 'học sinh khác còn nguyên');
select is((select count(*)::int from public.audit_logs where action = 'student_deleted' and class_id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'nhật ký ghi student_deleted');

-- học sinh chưa có tài khoản: không có id Auth để xóa
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.delete_student('00000000-0000-0000-0000-0000000000a3'), array[]::uuid[], 'học sinh chưa có tài khoản: mảng rỗng');
reset role;
select is((select count(*)::int from public.students where id = '00000000-0000-0000-0000-0000000000a3'), 0, 'học sinh chưa có tài khoản đã mất');

-- sổ sao vẫn bất biến với mọi đường khác
select throws_ok($$delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'$$,
  'P0001', 'ledger_immutable', 'xóa trực tiếp sổ sao vẫn bị chặn');
select set_config('app.student_purge', '00000000-0000-0000-0000-0000000000a9', true);
select throws_ok($$delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'$$,
  'P0001', 'ledger_immutable', 'đặt cờ xóa cho học sinh khác cũng không qua được');
select set_config('app.student_purge', '', true);

set local role anon;
select throws_ok($$select public.delete_student('00000000-0000-0000-0000-0000000000a2')$$,
  '42501', null, 'anon không có quyền thực thi delete_student');
reset role;

-- ===== xóa phần thưởng =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d4');
select throws_ok($$select public.delete_reward('00000000-0000-0000-0000-0000000000f6')$$,
  'P0001', 'not_allowed', 'học sinh không xóa được quà');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select throws_ok($$select public.delete_reward('00000000-0000-0000-0000-0000000000f6')$$,
  'P0001', 'reward_not_found', 'giáo viên lớp khác không xóa được quà');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is(public.delete_reward('00000000-0000-0000-0000-0000000000f6'),
  '00000000-0000-0000-0000-0000000000c1/rewards/r.png', 'xóa quà chưa ai đổi trả về đường dẫn ảnh');
select is((select count(*)::int from public.rewards where id = '00000000-0000-0000-0000-0000000000f6'), 0, 'quà đã mất');
-- Yêu cầu của học sinh a1 đã bị xóa cùng học sinh, nên thêm lại một yêu cầu của học sinh a2 vào quà f5.
reset role;
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-0000000000f5', 5, 'rejected');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.delete_reward('00000000-0000-0000-0000-0000000000f5')$$,
  'P0001', 'reward_has_requests', 'quà đã có lịch sử (kể cả bị từ chối) không xóa được');
select is((select count(*)::int from public.rewards where id = '00000000-0000-0000-0000-0000000000f5'), 1, 'quà có lịch sử còn nguyên');
reset role;
select is((select count(*)::int from public.audit_logs where action = 'reward_deleted' and class_id = '00000000-0000-0000-0000-0000000000c1'),
  1, 'nhật ký ghi reward_deleted');
set local role anon;
select throws_ok($$select public.delete_reward('00000000-0000-0000-0000-0000000000f5')$$,
  '42501', null, 'anon không có quyền thực thi delete_reward');
reset role;

-- ===== gỡ avatar =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.set_avatar_for('00000000-0000-0000-0000-0000000000d1', null)$$, 'gỡ avatar của giáo viên');
select lives_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1')$$, 'đặt avatar trước khi gỡ');
select lives_ok($$select public.set_student_avatar('00000000-0000-0000-0000-0000000000a2', null)$$, 'gỡ avatar học sinh theo students.id');
reset role;
select is((select avatar_id from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'), null::uuid, 'profiles.avatar_id về null');
select is((select avatar_id from public.students where id = '00000000-0000-0000-0000-0000000000a2'), null::uuid, 'students.avatar_id về null');

-- ===== xóa ảnh tải lên khỏi thư viện =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.delete_avatar_upload('00000000-0000-0000-0000-0000000000f1')$$,
  'P0001', 'avatar_not_found', 'avatar preset không xóa được');
select throws_ok($$select public.delete_avatar_upload('00000000-0000-0000-0000-0000000000f3')$$,
  'P0001', 'avatar_not_found', 'ảnh của lớp khác không xóa được');
select lives_ok($$update public.students set avatar_id = '00000000-0000-0000-0000-0000000000f2' where id = '00000000-0000-0000-0000-0000000000a2'$$,
  'gán ảnh tải lên cho một học sinh');
select is(public.delete_avatar_upload('00000000-0000-0000-0000-0000000000f2'),
  '00000000-0000-0000-0000-0000000000c1/avatars/x.png', 'xóa ảnh tải lên trả về đường dẫn');
reset role;
select is((select count(*)::int from public.avatar_library where id = '00000000-0000-0000-0000-0000000000f2'), 0, 'ảnh đã mất khỏi thư viện');
select is((select avatar_id from public.students where id = '00000000-0000-0000-0000-0000000000a2'), null::uuid, 'người đang dùng ảnh tự về null');

-- ===== tên trạm =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.save_class_info('{"brand_title":"  Trạm không gian Năm 9  "}')$$, 'lưu brand_title');
select is((select brand_title from public.classes where id = '00000000-0000-0000-0000-0000000000c1'),
  'Trạm không gian Năm 9', 'brand_title được cắt khoảng trắng');
select throws_ok($$select public.save_class_info(('{"brand_title":"' || repeat('x', 61) || '"}')::jsonb)$$,
  'P0001', 'invalid_input', 'brand_title quá 60 ký tự bị chặn');
select throws_ok($$select public.save_class_info('{"brand_title":123}')$$,
  'P0001', 'invalid_input', 'brand_title không phải chuỗi bị chặn');
select lives_ok($$select public.save_class_info('{"brand_title":"   "}')$$, 'brand_title rỗng = bỏ');
select is((select brand_title from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), null::text, 'brand_title rỗng thành null');
reset role;

select * from finish();
rollback;
