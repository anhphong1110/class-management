begin;
select plan(172);

create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;

-- ===== trigger classes -> class_settings =====
insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'), ('00000000-0000-0000-0000-0000000000c2', '5B'),
  ('00000000-0000-0000-0000-0000000000c3', '5C lớp cũ');
select is((select count(*)::int from public.class_settings where class_id in
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3')),
  3, 'thêm classes thì có ngay class_settings');
select has_column('public', 'classes', 'owner_id', 'classes.owner_id');
select has_column('public', 'profiles', 'login_disabled', 'profiles.login_disabled');

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 't@test.local'), ('00000000-0000-0000-0000-0000000000d2', 't2@test.local'),
  ('00000000-0000-0000-0000-0000000000d3', 'a1@test.local'), ('00000000-0000-0000-0000-0000000000d4', 'a2@test.local'),
  ('00000000-0000-0000-0000-0000000000d5', 'z1@test.local');
insert into public.students (id, class_id, code, roll_no, full_name, archived_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A1', null),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'A2', null),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'A3 lưu trữ', now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'B1', null),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c3', 'HS01', 1, 'Z1', null);
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'teacher', 'co.t', 'Cô T', null),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c2', 'teacher', 'co.t2', 'Cô T2', null),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a1', 'A1', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.a2', 'A2', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000c3', 'student', 'hs.z1', 'Z1', '00000000-0000-0000-0000-0000000000e1');
insert into public.star_transactions (class_id, student_id, delta, kind, note, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 7, 'award', 'x', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 4, 'award', 'x', gen_random_uuid()),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e1', 4, 'award', 'x', gen_random_uuid());
insert into public.missions (id, class_id, name, period, reward_stars, active) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'M1 ba sao', 'week', 3, true),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', 'M2 không sao', 'month', 0, true);
insert into public.rewards (id, class_id, name, cost, stock) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000c1', 'Bút', 5, 3);

-- ===== ràng buộc =====
select throws_ok($$update public.class_settings set weekly_redeem_limit = 0 where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'weekly_redeem_limit 0 bị chặn');
select throws_ok($$update public.class_settings set weekly_redeem_limit = 21 where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'weekly_redeem_limit 21 bị chặn');
select throws_ok($$update public.class_settings set star_steps = '{}' where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'star_steps rỗng bị chặn');
select throws_ok($$update public.class_settings set star_steps = '{1,2,3,4,5,6,7,8,9}' where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'star_steps 9 phần tử bị chặn');
select throws_ok($$update public.class_settings set star_steps = '{0,2}' where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'star_steps có 0 bị chặn');
select throws_ok($$update public.class_settings set star_steps = '{51}' where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'star_steps có 51 bị chặn');
select throws_ok($$update public.class_settings set star_steps = '{2,2}' where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '23514', null, 'star_steps trùng bị chặn');
select lives_ok($$update public.class_settings set star_steps = '{50,1}', weekly_redeem_limit = 20 where class_id = '00000000-0000-0000-0000-0000000000c1'$$, 'star_steps hợp lệ ở biên');
select throws_ok($$insert into public.profiles (id, class_id, role, username, display_name, student_id)
  values ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000c1', 'student', 'hs.nostu', 'X', null)$$, '23514', null, 'học sinh không có student_id bị chặn');
select throws_ok($$update public.profiles set student_id = '00000000-0000-0000-0000-0000000000a3' where id = '00000000-0000-0000-0000-0000000000d1'$$, '23514', null, 'giáo viên có student_id bị chặn');
select throws_ok($$update public.profiles set username = 'ab' where id = '00000000-0000-0000-0000-0000000000d1'$$, '23514', null, 'username quá ngắn bị chặn');
select throws_ok($$update public.profiles set username = 'Co.Khanh' where id = '00000000-0000-0000-0000-0000000000d1'$$, '23514', null, 'username có chữ hoa bị chặn');

-- ===== archived_at chỉ sửa qua archive_student =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$update public.students set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a2'$$, 'P0001', 'use_archive_student', 'UPDATE archived_at trực tiếp bị chặn');
select throws_ok($$update public.students set archived_at = null where id = '00000000-0000-0000-0000-0000000000a3'$$, 'P0001', 'use_archive_student', 'bỏ lưu trữ trực tiếp bị chặn');
select set_config('app.archive_student', 'on', true);
select throws_ok($$update public.students set archived_at = now() where id = '00000000-0000-0000-0000-0000000000a2'$$, 'P0001', 'use_archive_student', 'tự đặt set_config cũng không qua được');
reset role;
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$update public.students set full_name = 'A2 đổi tên' where id = '00000000-0000-0000-0000-0000000000a2'$$, 'sửa cột khác vẫn được');
reset role;

-- ===== duyệt yêu cầu của học sinh đã lưu trữ =====
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f5', 5, 'pending');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.approve_reward_request('00000000-0000-0000-0000-0000000000e2')$$, 'P0001', 'student_not_found', 'approve từ chối học sinh đã lưu trữ');
select is((select status::text from public.reward_requests where id = '00000000-0000-0000-0000-0000000000e2'), 'pending', 'yêu cầu vẫn pending');
reset role;
delete from public.reward_requests where id = '00000000-0000-0000-0000-0000000000e2';

-- ===== archive_student vẫn chạy và trả sao đang giữ =====
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f5', 4, 'pending');
insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -4, 'reserve', '00000000-0000-0000-0000-0000000000e3');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.archive_student('00000000-0000-0000-0000-0000000000a2')$$, 'archive_student vẫn lưu trữ được');
select ok((select archived_at is not null from public.students where id = '00000000-0000-0000-0000-0000000000a2'), 'A2 đã có archived_at');
select is((select coalesce(sum(delta), 0)::int from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000a2'), 4, 'archive_student trả sao đang giữ');
select is((select status::text from public.reward_requests where id = '00000000-0000-0000-0000-0000000000e3'), 'rejected', 'yêu cầu đang chờ bị từ chối');
select throws_ok($$update public.students set archived_at = null where id = '00000000-0000-0000-0000-0000000000a2'$$, 'P0001', 'use_archive_student', 'sau archive_student cũng không sửa tay được');
reset role;
-- vai postgres (SQL quản trị, e2e) vẫn mở lại được A2 cho các phần sau
update public.students set archived_at = null where id = '00000000-0000-0000-0000-0000000000a2';

-- ===== nhật ký rewards =====
select is((select count(*)::int from public.audit_logs where action = 'reward_created' and entity_id = '00000000-0000-0000-0000-0000000000f5'), 1, 'thêm quà ghi reward_created');
update public.rewards set cost = 8, name = 'Bút mới' where id = '00000000-0000-0000-0000-0000000000f5';
select is((select count(*)::int from public.audit_logs where action = 'reward_updated' and entity_id = '00000000-0000-0000-0000-0000000000f5'), 1, 'sửa quà ghi reward_updated');
select is((select payload->>'cost' from public.audit_logs where action = 'reward_updated' and entity_id = '00000000-0000-0000-0000-0000000000f5'), '8', 'payload có cost mới');
select ok((select not (payload ? 'stock') from public.audit_logs where action = 'reward_updated' and entity_id = '00000000-0000-0000-0000-0000000000f5'), 'payload chỉ có cột đổi');
update public.rewards set cost = 8 where id = '00000000-0000-0000-0000-0000000000f5';
select is((select count(*)::int from public.audit_logs where action = 'reward_updated' and entity_id = '00000000-0000-0000-0000-0000000000f5'), 1, 'UPDATE không đổi gì thì không ghi thêm');
select is((select class_id from public.audit_logs where action = 'reward_created' and entity_id = '00000000-0000-0000-0000-0000000000f5'), '00000000-0000-0000-0000-0000000000c1'::uuid, 'nhật ký quà có class_id');

-- ===== lớp đã lưu trữ =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d5');
select is((select count(*)::int from public.students), 1, 'lớp còn dùng: học sinh đọc được students');
select is((select count(*)::int from public.v_my_star_history), 1, 'lớp còn dùng: v_my_star_history 1 dòng');
reset role;
update public.classes set archived_at = now() where id = '00000000-0000-0000-0000-0000000000c3';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d5');
select is((select private.my_class_id()), null::uuid, 'lớp lưu trữ: my_class_id null');
select is((select private.my_student_id()), null::uuid, 'lớp lưu trữ: my_student_id null');
select is((select count(*)::int from public.students), 0, 'lớp lưu trữ: students 0 dòng');
select is((select count(*)::int from public.v_my_star_history), 0, 'lớp lưu trữ: v_my_star_history 0 dòng');
select is((select count(*)::int from public.leaderboard_for_period('year')), 0, 'lớp lưu trữ: leaderboard_for_period 0 dòng');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select private.my_class_id()), '00000000-0000-0000-0000-0000000000c1'::uuid, 'giáo viên lớp còn dùng không đổi');
reset role;

-- ===== save_class_info =====
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select public.save_class_info('{"class_name":"X"}')$$, 'P0001', 'not_allowed', 'học sinh không gọi save_class_info');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.save_class_info('{"school_name":"  Tiểu học A  ","class_name":"5A1","school_year":"2026 – 2027","teacher_name":"Cô Khanh","slogan":"","theme":"mint",
  "term1_start":"2026-09-05","term1_end":"2027-01-15","term2_start":"2027-01-18","term2_end":"2027-05-31"}')$$, 'save_class_info thành công');
select is((select school_name from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), 'Tiểu học A', 'school_name được trim');
select is((select theme from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), 'mint', 'theme mint');
select is((select slogan from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), '', 'slogan rỗng được phép');
select is((select term2_end from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), '2027-05-31'::date, 'term2_end');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is((select class_name from public.classes where id = '00000000-0000-0000-0000-0000000000c2'), '5B', 'lớp khác không đổi');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.save_class_info('{"term2_start":null,"term2_end":null}')$$, 'ngày null được phép');
select is((select term2_start from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), null::date, 'term2_start null');
select throws_ok($$select public.save_class_info('{"term1_start":"2027-02-01","term1_end":"2027-01-15","term2_start":"2027-01-18","term2_end":"2027-05-31"}')$$, 'P0001', 'invalid_term_dates', 'học kỳ 1 bắt đầu sau khi kết thúc');
select throws_ok($$select public.save_class_info('{"term1_start":"2026-09-05","term1_end":"2027-01-20","term2_start":"2027-01-18","term2_end":"2027-05-31"}')$$, 'P0001', 'invalid_term_dates', 'học kỳ 2 bắt đầu trước khi học kỳ 1 kết thúc');
select throws_ok($$select public.save_class_info('{"term1_start":"2026-09-05","term1_end":"2027-01-15","term2_start":"2027-01-18","term2_end":"2027-01-17"}')$$, 'P0001', 'invalid_term_dates', 'học kỳ 2 kết thúc trước khi bắt đầu');
select throws_ok($$select public.save_class_info('{"term1_end":"2026-08-01"}')$$, 'P0001', 'invalid_term_dates', 'kết hợp với giá trị đang lưu cũng được kiểm');
select throws_ok($$select public.save_class_info('{"bogus":"x"}')$$, 'P0001', 'invalid_input', 'key lạ');
select throws_ok($$select public.save_class_info('[]')$$, 'P0001', 'invalid_input', 'không phải object');
select throws_ok($$select public.save_class_info('{}')$$, 'P0001', 'invalid_input', 'object rỗng');
select throws_ok($$select public.save_class_info('{"school_name":"   "}')$$, 'P0001', 'invalid_input', 'school_name rỗng');
select throws_ok($$select public.save_class_info(jsonb_build_object('class_name', repeat('a', 121)))$$, 'P0001', 'invalid_input', 'class_name 121 ký tự');
select throws_ok($$select public.save_class_info(jsonb_build_object('slogan', repeat('a', 121)))$$, 'P0001', 'invalid_input', 'slogan 121 ký tự');
select throws_ok($$select public.save_class_info('{"theme":"red"}')$$, 'P0001', 'invalid_input', 'theme sai');
select throws_ok($$select public.save_class_info('{"term1_start":"không phải ngày"}')$$, 'P0001', 'invalid_input', 'ngày sai định dạng');
select throws_ok($$select public.save_class_info('{"term1_start":"2027-02-01","term1_end":null,"term2_start":"2026-09-01","term2_end":null}')$$, 'P0001', 'invalid_term_dates', 'term1_start sau term2_start (không cần đủ bốn ngày)');
select throws_ok($$select public.save_class_info('{"term1_start":"2026-09-05","term1_end":null,"term2_start":null,"term2_end":"2026-08-01"}')$$, 'P0001', 'invalid_term_dates', 'term2_end trước term1_start');
select throws_ok($$select public.save_class_info('{"term1_end":"infinity"}')$$, 'P0001', 'invalid_term_dates', 'ngày infinity bị từ chối');
select throws_ok($$select public.save_class_info('{"term2_start":"-infinity"}')$$, 'P0001', 'invalid_term_dates', 'ngày -infinity bị từ chối');
select throws_ok($$select public.save_class_info('{"school_name":5}')$$, 'P0001', 'invalid_input', 'school_name không phải chuỗi');
select is((select count(*)::int from public.audit_logs where action = 'class.info' and class_id = '00000000-0000-0000-0000-0000000000c1'), 2, 'audit class.info');

-- ===== đường dẫn ảnh thương hiệu (logo_path, class_logo_path, cover_path) =====
select lives_ok($$select public.save_class_info('{"logo_path":"00000000-0000-0000-0000-0000000000c1/branding/a.png","class_logo_path":"00000000-0000-0000-0000-0000000000c1/branding/b.webp","cover_path":"00000000-0000-0000-0000-0000000000c1/branding/c-1.jpg"}')$$, 'ba đường dẫn branding hợp lệ');
select is((select cover_path from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), '00000000-0000-0000-0000-0000000000c1/branding/c-1.jpg', 'cover_path được lưu');
select throws_ok($$select public.save_class_info('{"cover_path":"00000000-0000-0000-0000-0000000000c2/branding/x.png"}')$$, 'P0001', 'invalid_input', 'đường dẫn của lớp khác bị từ chối');
select throws_ok($$select public.save_class_info('{"logo_path":"00000000-0000-0000-0000-0000000000c1/logo/x.png"}')$$, 'P0001', 'invalid_input', 'không nằm trong thư mục branding');
select throws_ok($$select public.save_class_info('{"class_logo_path":"00000000-0000-0000-0000-0000000000c1/branding/../../00000000-0000-0000-0000-0000000000c2/x.png"}')$$, 'P0001', 'invalid_input', 'đường dẫn có ..');
select throws_ok($$select public.save_class_info('{"cover_path":"00000000-0000-0000-0000-0000000000c1/branding/."}')$$, 'P0001', 'invalid_input', 'tên file chỉ có dấu chấm bị từ chối');
select throws_ok($$select public.save_class_info('{"cover_path":5}')$$, 'P0001', 'invalid_input', 'đường dẫn không phải chuỗi');
select lives_ok($$select public.save_class_info('{"cover_path":null}')$$, 'cover_path null để bỏ ảnh');
select is((select cover_path from public.classes where id = '00000000-0000-0000-0000-0000000000c1'), null, 'cover_path đã bỏ');
select lives_ok($$insert into storage.objects (bucket_id, name, owner_id) values ('class-media', '00000000-0000-0000-0000-0000000000c1/branding/a.png', '00000000-0000-0000-0000-0000000000d1')$$, 'giáo viên tải được vào branding');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select count(*)::int from storage.objects where bucket_id = 'class-media' and name = '00000000-0000-0000-0000-0000000000c1/branding/a.png'), 1, 'học sinh cùng lớp đọc được ảnh branding');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from storage.objects where bucket_id = 'class-media' and name = '00000000-0000-0000-0000-0000000000c1/branding/a.png'), 0, 'giáo viên lớp khác không đọc được ảnh branding');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');

-- ===== save_class_settings =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select public.save_class_settings('{"require_approval":false}')$$, 'P0001', 'not_allowed', 'học sinh không gọi save_class_settings');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.save_class_settings('{"require_approval":false,"reserve_on_request":false,"only_enough":false,"feature_missions":false,
  "feature_random":false,"feature_display":false,"feature_rewards":false,"student_can_view_profile":false,"student_can_view_history":false,
  "student_can_view_rank":false,"student_can_view_rewards":false,"student_can_view_timetable":false,"student_can_view_news":false,
  "student_can_view_attendance":true,"student_can_change_avatar":false,"weekly_redeem_limit":5,"star_steps":[1,2,4,8]}')$$, 'save_class_settings thành công');
select is((select (not require_approval and not feature_rewards and student_can_view_attendance and not student_can_change_avatar and weekly_redeem_limit = 5)
  from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), true, 'các cờ đã lưu');
select is((select star_steps from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), array[1,2,4,8], 'star_steps đã lưu');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select is((select require_approval from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c2'), true, 'lớp khác không đổi');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.save_class_settings('{"require_approval":true}')$$, 'chỉ gửi một cờ cũng được');
select is((select weekly_redeem_limit from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), 5, 'cờ không gửi giữ nguyên');
select throws_ok($$select public.save_class_settings('{"timetable_saturday":true}')$$, 'P0001', 'use_set_saturday', 'timetable_saturday phải qua set_timetable_saturday');
select throws_ok($$select public.save_class_settings('{"require_approval":false,"timetable_saturday":false}')$$, 'P0001', 'use_set_saturday', 'use_set_saturday cả khi gửi kèm cờ khác');
select is((select require_approval from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), true, 'lỗi thì không ghi gì');
select throws_ok($$select public.save_class_settings('{"bogus":true}')$$, 'P0001', 'invalid_input', 'key lạ');
select throws_ok($$select public.save_class_settings('{"require_approval":"yes"}')$$, 'P0001', 'invalid_input', 'cờ không phải boolean');
select throws_ok($$select public.save_class_settings('{}')$$, 'P0001', 'invalid_input', 'object rỗng');
select throws_ok($$select public.save_class_settings('null')$$, 'P0001', 'invalid_input', 'không phải object');
select throws_ok($$select public.save_class_settings('{"weekly_redeem_limit":0}')$$, 'P0001', 'invalid_redeem_limit', 'lượt đổi 0');
select throws_ok($$select public.save_class_settings('{"weekly_redeem_limit":21}')$$, 'P0001', 'invalid_redeem_limit', 'lượt đổi 21');
select throws_ok($$select public.save_class_settings('{"weekly_redeem_limit":1.5}')$$, 'P0001', 'invalid_redeem_limit', 'lượt đổi không nguyên');
select throws_ok($$select public.save_class_settings('{"weekly_redeem_limit":"2"}')$$, 'P0001', 'invalid_redeem_limit', 'lượt đổi không phải số');
select lives_ok($$select public.save_class_settings('{"weekly_redeem_limit":20}')$$, 'lượt đổi 20 ở biên');
select throws_ok($$select public.save_class_settings('{"star_steps":[]}')$$, 'P0001', 'invalid_star_steps', 'star_steps rỗng');
select throws_ok($$select public.save_class_settings('{"star_steps":[1,2,3,4,5,6,7,8,9]}')$$, 'P0001', 'invalid_star_steps', 'star_steps 9 mức');
select throws_ok($$select public.save_class_settings('{"star_steps":[0,1]}')$$, 'P0001', 'invalid_star_steps', 'star_steps có 0');
select throws_ok($$select public.save_class_settings('{"star_steps":[1,51]}')$$, 'P0001', 'invalid_star_steps', 'star_steps có 51');
select throws_ok($$select public.save_class_settings('{"star_steps":[3,3]}')$$, 'P0001', 'invalid_star_steps', 'star_steps trùng');
select throws_ok($$select public.save_class_settings('{"star_steps":[1,2.5]}')$$, 'P0001', 'invalid_star_steps', 'star_steps không nguyên');
select throws_ok($$select public.save_class_settings('{"star_steps":["a"]}')$$, 'P0001', 'invalid_star_steps', 'star_steps không phải số');
select throws_ok($$select public.save_class_settings('{"star_steps":5}')$$, 'P0001', 'invalid_star_steps', 'star_steps không phải mảng');
select lives_ok($$select public.save_class_settings('{"star_steps":[1,2,3,4,5,6,7,50]}')$$, 'star_steps 8 mức ở biên');
select is((select count(*)::int from public.audit_logs where action = 'class.settings' and class_id = '00000000-0000-0000-0000-0000000000c1'), 4, 'audit class.settings');

-- ===== set_timetable_saturday =====
reset role;
insert into public.subjects (id, class_id, name) values ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000c1', 'Toán');
insert into public.timetable_slots (class_id, weekday, session, period, subject_id) values
  ('00000000-0000-0000-0000-0000000000c1', 6, 'morning', 1, '00000000-0000-0000-0000-0000000000f6'),
  ('00000000-0000-0000-0000-0000000000c1', 2, 'morning', 1, '00000000-0000-0000-0000-0000000000f6');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select public.set_timetable_saturday(true, false)$$, 'P0001', 'not_allowed', 'học sinh không bật thứ Bảy');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.set_timetable_saturday(null, false)$$, 'P0001', 'invalid_input', 'p_on null');
select is(public.set_timetable_saturday(true, false), 0, 'bật thứ Bảy trả 0');
select is((select timetable_saturday from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), true, 'đã bật');
select throws_ok($$select public.set_timetable_saturday(false, false)$$, 'P0001', 'saturday_has_slots', 'tắt khi còn tiết thứ Bảy');
select is((select timetable_saturday from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), true, 'vẫn bật sau lỗi');
select is((select count(*)::int from public.timetable_slots where class_id = '00000000-0000-0000-0000-0000000000c1' and weekday = 6), 1, 'tiết thứ Bảy còn nguyên');
select is(public.set_timetable_saturday(false, true), 1, 'tắt và xóa trả 1');
select is((select count(*)::int from public.timetable_slots where class_id = '00000000-0000-0000-0000-0000000000c1' and weekday = 6), 0, 'không còn tiết thứ Bảy');
select is((select count(*)::int from public.timetable_slots where class_id = '00000000-0000-0000-0000-0000000000c1' and weekday = 2), 1, 'tiết các ngày khác còn nguyên');
select is((select timetable_saturday from public.class_settings where class_id = '00000000-0000-0000-0000-0000000000c1'), false, 'đã tắt');
select is(public.set_timetable_saturday(false, false), 0, 'tắt khi không còn tiết thì không cần xóa');
select is((select count(*)::int from public.audit_logs where action = 'class.saturday' and class_id = '00000000-0000-0000-0000-0000000000c1'), 3, 'audit class.saturday');

-- ===== undo_mission_completion =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận nhiệm vụ 3 sao');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận nhiệm vụ 0 sao');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'A1 có 10 sao');
create temp table cids (k text primary key, v uuid);
grant all on cids to authenticated;
insert into cids select 'm1', id from public.mission_completions where mission_id = '00000000-0000-0000-0000-0000000000f1';
insert into cids select 'm2', id from public.mission_completions where mission_id = '00000000-0000-0000-0000-0000000000f2';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select throws_ok($$select public.undo_mission_completion((select v from cids where k = 'm1'))$$, 'P0001', 'not_allowed', 'học sinh không hoàn tác');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select throws_ok($$select public.undo_mission_completion((select v from cids where k = 'm1'))$$, 'P0001', 'completion_not_found', 'giáo viên lớp khác');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$select public.undo_mission_completion(gen_random_uuid())$$, 'P0001', 'completion_not_found', 'không có lượt hoàn thành');
select lives_ok($$select public.undo_mission_completion((select v from cids where k = 'm2'))$$, 'hoàn tác nhiệm vụ 0 sao');
select is((select count(*)::int from public.mission_completions where mission_id = '00000000-0000-0000-0000-0000000000f2'), 0, 'dòng 0 sao đã mất');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'sao không đổi với nhiệm vụ 0 sao');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận lại nhiệm vụ 0 sao');
select lives_ok($$select public.undo_mission_completion((select v from cids where k = 'm1'))$$, 'hoàn tác nhiệm vụ 3 sao');
select is((select count(*)::int from public.mission_completions where mission_id = '00000000-0000-0000-0000-0000000000f1'), 0, 'dòng 3 sao đã mất');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 7, 'sao về như cũ');
select throws_ok($$select public.undo_mission_completion((select v from cids where k = 'm1'))$$, 'P0001', 'completion_not_found', 'hoàn tác lần hai');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1')$$, 'ghi nhận lại nhiệm vụ 3 sao');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a1')::int, 10, 'sao lại là 10');
select is((select count(*)::int from public.audit_logs where action = 'missions.undo' and class_id = '00000000-0000-0000-0000-0000000000c1'), 2, 'audit missions.undo');

-- ===== my_profile_summary =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
reset role;
update public.class_settings set student_can_view_profile = true, student_can_view_rank = true where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select competition_stars from public.my_profile_summary()), 10, 'cờ bật: có competition_stars');
select ok((select rank_year is not null and class_size is not null from public.my_profile_summary()), 'cờ bật: có rank_year và class_size');
reset role;
update public.class_settings set student_can_view_profile = false where class_id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d3');
select is((select count(*)::int from public.my_profile_summary()), 1, 'cờ tắt: vẫn trả một dòng');
select ok((select competition_stars is null and rank_year is null and class_size is null from public.my_profile_summary()), 'cờ tắt: các ô số liệu null');
select is((select available_stars from public.my_profile_summary()), 10, 'cờ tắt: sao khả dụng vẫn trả');
select is((select full_name from public.my_profile_summary()), 'A1', 'cờ tắt: lời chào (họ tên) vẫn trả');
reset role;
update public.class_settings set student_can_view_profile = true where class_id = '00000000-0000-0000-0000-0000000000c1';

-- ===== attendance chỉ ghi qua save_attendance =====
update public.classes set term1_start = (now() at time zone 'Asia/Ho_Chi_Minh')::date - 30 where id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$insert into public.attendance (class_id, student_id, date, status)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', current_date, 'present')$$, '42501', null, 'giáo viên INSERT trực tiếp attendance bị chặn');
select lives_ok($$select public.save_attendance((now() at time zone 'Asia/Ho_Chi_Minh')::date,
  '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"present"}]')$$, 'save_attendance vẫn ghi được');
update public.attendance set status = 'late' where student_id = '00000000-0000-0000-0000-0000000000a1';
select is((select status::text from public.attendance where student_id = '00000000-0000-0000-0000-0000000000a1'), 'present', 'giáo viên UPDATE trực tiếp attendance không có tác dụng');
select throws_ok($$select public.save_attendance((now() at time zone 'Asia/Ho_Chi_Minh')::date - 31,
  '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"present"}]')$$, 'P0001', 'before_school_year', 'ngày trước term1_start');
select lives_ok($$select public.save_attendance((now() at time zone 'Asia/Ho_Chi_Minh')::date - 30,
  '[{"student_id":"00000000-0000-0000-0000-0000000000a1","status":"present"}]')$$, 'đúng ngày term1_start được ghi');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
select lives_ok($$select public.save_attendance((now() at time zone 'Asia/Ho_Chi_Minh')::date - 31, '[]')$$, 'lớp chưa đặt term1_start thì không chặn');

-- ===== undo khi sao đang được giữ cho yêu cầu đổi quà =====
reset role;
update public.classes set term1_start = null where id = '00000000-0000-0000-0000-0000000000c1';
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$select public.complete_mission('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2')$$, 'ghi nhận nhiệm vụ 3 sao cho A2');
create temp table hold (v uuid);
grant all on hold to authenticated;
insert into hold select id from public.mission_completions where student_id = '00000000-0000-0000-0000-0000000000a2' and mission_id = '00000000-0000-0000-0000-0000000000f1';
reset role;
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  ('00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f5', 6, 'pending');
insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -6, 'reserve', '00000000-0000-0000-0000-0000000000e4');
set local role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a2')::int, 1, 'A2 chỉ còn 1 sao khả dụng');
select throws_ok($$select public.undo_mission_completion((select v from hold))$$, 'P0001', 'insufficient_stars', 'undo khi sao đang được giữ: insufficient_stars');
select is((select count(*)::int from public.mission_completions where id = (select v from hold)), 1, 'dòng hoàn thành vẫn còn');
select is((select available_stars from public.v_student_stars where student_id = '00000000-0000-0000-0000-0000000000a2')::int, 1, 'sao không đổi sau lỗi');

-- ===== quyền cột =====
select throws_ok($$update public.classes set owner_id = '00000000-0000-0000-0000-0000000000d2' where id = '00000000-0000-0000-0000-0000000000c1'$$, '42501', null, 'giáo viên không sửa classes.owner_id');
select throws_ok($$update public.classes set archived_at = now() where id = '00000000-0000-0000-0000-0000000000c1'$$, '42501', null, 'giáo viên không sửa classes.archived_at');
select lives_ok($$update public.classes set slogan = 'Khẩu hiệu' where id = '00000000-0000-0000-0000-0000000000c1'$$, 'giáo viên vẫn sửa các cột còn lại của classes');
select throws_ok($$update public.class_settings set timetable_saturday = true where class_id = '00000000-0000-0000-0000-0000000000c1'$$, '42501', null, 'giáo viên không sửa timetable_saturday trực tiếp');
select lives_ok($$update public.class_settings set only_enough = false where class_id = '00000000-0000-0000-0000-0000000000c1'$$, 'giáo viên vẫn sửa các cờ khác của class_settings');
select throws_ok($$update public.rewards set stock = 99 where id = '00000000-0000-0000-0000-0000000000f5'$$, '42501', null, 'giáo viên không sửa stock trực tiếp');
select lives_ok($$update public.rewards set hidden = true where id = '00000000-0000-0000-0000-0000000000f5'$$, 'giáo viên vẫn sửa các cột còn lại của rewards');
select lives_ok($$select public.set_reward_stock('00000000-0000-0000-0000-0000000000f5', 5)$$, 'set_reward_stock vẫn đổi được stock');
select lives_ok($$insert into public.rewards (class_id, name, cost, stock) values ('00000000-0000-0000-0000-0000000000c1', 'Quà mới', 3, 4)$$, 'giáo viên vẫn thêm quà kèm stock');

-- ===== quyền hàm =====
reset role;
select ok(not has_function_privilege('anon', 'public.save_class_info(jsonb)', 'execute')
  and not has_function_privilege('public', 'public.save_class_info(jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.save_class_info(jsonb)', 'execute'), 'quyền save_class_info');
select ok(not has_function_privilege('anon', 'public.save_class_settings(jsonb)', 'execute')
  and not has_function_privilege('public', 'public.save_class_settings(jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.save_class_settings(jsonb)', 'execute'), 'quyền save_class_settings');
select ok(not has_function_privilege('anon', 'public.set_timetable_saturday(boolean,boolean)', 'execute')
  and not has_function_privilege('public', 'public.set_timetable_saturday(boolean,boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.set_timetable_saturday(boolean,boolean)', 'execute'), 'quyền set_timetable_saturday');
select ok(not has_function_privilege('anon', 'public.undo_mission_completion(uuid)', 'execute')
  and not has_function_privilege('public', 'public.undo_mission_completion(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.undo_mission_completion(uuid)', 'execute'), 'quyền undo_mission_completion');

-- Quyền cột (đợt sửa cuối): ảnh thương hiệu chỉ do save_class_info ghi; profiles chỉ display_name/avatar_id; is_demo không sửa được.
select ok(not has_column_privilege('authenticated', 'public.classes', 'logo_path', 'update')
  and not has_column_privilege('authenticated', 'public.classes', 'class_logo_path', 'update')
  and not has_column_privilege('authenticated', 'public.classes', 'cover_path', 'update')
  and has_column_privilege('authenticated', 'public.classes', 'slogan', 'update'), 'classes: không UPDATE trực tiếp ba cột đường dẫn ảnh');
select ok(has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update')
  and has_column_privilege('authenticated', 'public.profiles', 'avatar_id', 'update'), 'profiles: UPDATE được display_name và avatar_id');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'role', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'student_id', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'login_disabled', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'class_id', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'username', 'update'), 'profiles: không UPDATE role, student_id, login_disabled, class_id, username');
select is((select count(*)::int
             from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' and a.attname = 'is_demo' and not a.attisdropped
              and has_column_privilege('authenticated', c.oid, a.attnum, 'update')
              and exists (select 1 from pg_policies pp where pp.schemaname = 'public' and pp.tablename = c.relname
                             and pp.cmd in ('UPDATE', 'ALL') and pp.policyname = 'teacher_update')), 0,
  'không bảng nào cho giáo viên UPDATE cột is_demo');

select * from finish();
rollback;
