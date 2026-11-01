-- Đợt 6, Task 7: mở năm học mới (start_new_school_year) và xóa dữ liệu demo (delete_demo_data).
begin;
select plan(106);

create function pg_temp.u(h text) returns uuid language sql immutable
as $$ select ('00000000-0000-0000-0000-' || lpad(h, 12, '0'))::uuid $$;
grant execute on function pg_temp.u(text) to public;
create function pg_temp.as_user(u uuid) returns void language sql
as $$ select set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true) $$;
grant execute on function pg_temp.as_user(uuid) to public;
create function pg_temp.cnt(t text, c uuid) returns bigint language plpgsql
as $$ declare n bigint; begin execute format('select count(*) from public.%I where class_id = $1', t) into n using c; return n; end $$;
grant execute on function pg_temp.cnt(text, uuid) to public;
create function pg_temp.avail(s uuid) returns bigint language sql
as $$ select coalesce(sum(delta), 0)::bigint from public.star_transactions where student_id = s $$;
grant execute on function pg_temp.avail(uuid) to public;

-- ===== dữ liệu thử: lớp c1 (mở năm mới) =====
insert into auth.users (id, email) values
  (pg_temp.u('d1'), 't@test.local'), (pg_temp.u('d2'), 't2@test.local'), (pg_temp.u('d3'), 'a1@test.local'),
  (pg_temp.u('d5'), 'm1@test.local'), (pg_temp.u('d6'), 'r1@test.local');
insert into public.classes (id, school_name, class_name, school_year, teacher_name, slogan, logo_path, theme, owner_id) values
  (pg_temp.u('c1'), 'Trường A', '5A', '2026 – 2027', 'Cô T', 'Cùng nhau', pg_temp.u('c1') || '/branding/logo.png', 'pink', pg_temp.u('d1')),
  (pg_temp.u('c2'), 'Trường B', '5B', '2026 – 2027', 'Cô T2', '', null, 'indigo', pg_temp.u('d2'));
update public.class_settings set weekly_redeem_limit = 7, timetable_saturday = true, star_steps = '{1,2}', require_approval = false
 where class_id = pg_temp.u('c1');

insert into public.avatar_library (id, class_id, kind, preset, image_path, label) values
  (pg_temp.u('e1'), pg_temp.u('c1'), 'preset', '{"bg":"#fff"}', null, 'preset 1'),
  (pg_temp.u('e2'), pg_temp.u('c1'), 'upload', null, pg_temp.u('c1') || '/avatars/x.png', 'tải lên');
insert into public.students (id, class_id, code, roll_no, full_name) values
  (pg_temp.u('a1'), pg_temp.u('c1'), 'HS01', 1, 'A1'), (pg_temp.u('a2'), pg_temp.u('c1'), 'HS02', 2, 'A2');
insert into public.profiles (id, class_id, role, username, display_name, avatar_id, student_id) values
  (pg_temp.u('d1'), pg_temp.u('c1'), 'teacher', 'co.t', 'Cô T', pg_temp.u('e1'), null),
  (pg_temp.u('d2'), pg_temp.u('c2'), 'teacher', 'co.t2', 'Cô T2', null, null),
  (pg_temp.u('d3'), pg_temp.u('c1'), 'student', 'hs.a1', 'A1', null, pg_temp.u('a1'));
insert into public.star_criteria (id, class_id, label, kind, default_points) values
  (pg_temp.u('11'), pg_temp.u('c1'), 'Giơ tay', 'award', 1), (pg_temp.u('12'), pg_temp.u('c1'), 'Nói chuyện', 'penalty', 2);
insert into public.rewards (id, class_id, name, cost, stock, image_path) values
  (pg_temp.u('21'), pg_temp.u('c1'), 'Bút', 5, 3, pg_temp.u('c1') || '/rewards/r.png'),
  (pg_temp.u('22'), pg_temp.u('c1'), 'Vở', 4, 2, null);
insert into public.star_transactions (id, class_id, student_id, delta, kind, criterion_id, batch_id, actor_id) values
  (pg_temp.u('41'), pg_temp.u('c1'), pg_temp.u('a1'), 10, 'award', pg_temp.u('11'), pg_temp.u('91'), pg_temp.u('d1'));
-- Review Focus 4: một yêu cầu pending đang giữ 5 sao của a1.
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status) values
  (pg_temp.u('31'), pg_temp.u('c1'), pg_temp.u('a1'), pg_temp.u('21'), 5, 'pending');
insert into public.star_transactions (id, class_id, student_id, delta, kind, reward_request_id, actor_id) values
  (pg_temp.u('45'), pg_temp.u('c1'), pg_temp.u('a1'), -5, 'reserve', pg_temp.u('31'), pg_temp.u('d3'));
insert into public.subjects (id, class_id, name, is_demo) values (pg_temp.u('51'), pg_temp.u('c1'), 'Toán', false), (pg_temp.u('52'), pg_temp.u('c1'), 'Văn', true);
update public.rewards set is_demo = true where id = pg_temp.u('22');
insert into public.timetable_slots (class_id, weekday, session, period, subject_id) values
  (pg_temp.u('c1'), 1, 'morning', 1, pg_temp.u('51')), (pg_temp.u('c1'), 6, 'morning', 2, pg_temp.u('52'));
insert into public.missions (id, class_id, name, period, reward_stars) values (pg_temp.u('61'), pg_temp.u('c1'), 'M1', 'week', 3);
insert into public.badges (id, class_id, name) values (pg_temp.u('71'), pg_temp.u('c1'), 'Ngôi sao');

create temp table base as select count(*) as n from public.classes;
grant select on base to public;

-- ===== quyền hàm =====
select ok(has_function_privilege('authenticated', 'public.start_new_school_year(jsonb)', 'execute'), 'authenticated gọi được start_new_school_year');
select ok(not has_function_privilege('anon', 'public.start_new_school_year(jsonb)', 'execute'), 'anon không gọi được start_new_school_year');
select ok(has_function_privilege('authenticated', 'public.delete_demo_data()', 'execute'), 'authenticated gọi được delete_demo_data');
select ok(not has_function_privilege('anon', 'public.delete_demo_data()', 'execute'), 'anon không gọi được delete_demo_data');
select ok(not has_function_privilege('public', 'public.delete_demo_data()', 'execute'), 'PUBLIC không gọi được delete_demo_data');

-- ===== học sinh: not_allowed =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A"}'::jsonb)$$, 'P0001', 'not_allowed', 'học sinh mở năm học mới: not_allowed');
select throws_ok($$select public.delete_demo_data()$$, 'P0001', 'not_allowed', 'học sinh xóa dữ liệu demo: not_allowed');

-- ===== dữ liệu đầu vào sai: invalid_input, không đổi gì =====
select pg_temp.as_user(pg_temp.u('d1'));
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A","copy":["timetable"]}'::jsonb)$$, 'P0001', 'invalid_input', 'chép timetable mà thiếu subjects: invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A","copy":["timetable","criteria"]}'::jsonb)$$, 'P0001', 'invalid_input', 'timetable với criteria (không có subjects): invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A","copy":["students"]}'::jsonb)$$, 'P0001', 'invalid_input', 'chép học sinh: invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A","copy":"subjects"}'::jsonb)$$, 'P0001', 'invalid_input', 'copy không phải mảng: invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"  "}'::jsonb)$$, 'P0001', 'invalid_input', 'tên lớp trống: invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","class_name":"6A"}'::jsonb)$$, 'P0001', 'invalid_input', 'thiếu năm học: invalid_input');
select throws_ok($$select public.start_new_school_year('[]'::jsonb)$$, 'P0001', 'invalid_input', 'không phải object: invalid_input');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2027 – 2028","class_name":"6A","theme":"neon"}'::jsonb)$$, 'P0001', 'invalid_input', 'theme lạ: invalid_input');
reset role;
select is((select count(*)::int from public.classes), (select n::int from base), 'đầu vào sai không tạo lớp');
select is((select archived_at from public.classes where id = pg_temp.u('c1')), null, 'đầu vào sai không lưu trữ lớp cũ');
select is((select status::text from public.reward_requests where id = pg_temp.u('31')), 'pending', 'đầu vào sai không đụng tới yêu cầu pending');

-- ===== mở năm học mới với copy đầy đủ =====
select is((select pg_temp.avail(pg_temp.u('a1'))), 5::bigint, 'trước đó yêu cầu pending đang giữ 5 sao (còn 5 khả dụng)');

set local role authenticated;
select pg_temp.as_user(pg_temp.u('d1'));
select set_config('app.ny', public.start_new_school_year(jsonb_build_object(
  'expected_class_id', pg_temp.u('c1'), 'school_year', '2027 – 2028', 'class_name', '6A', 'teacher_name', 'Cô T mới',
  'copy', jsonb_build_array('subjects', 'timetable', 'criteria', 'rewards', 'avatars', 'settings', 'missions')))::text, true);
reset role;
create temp table ny as select current_setting('app.ny')::uuid as id;
grant select on ny to public;

select ok((select id is not null and id <> pg_temp.u('c1') from ny), 'trả id lớp mới');
select is((select owner_id from public.classes where id = (select id from ny)), pg_temp.u('d1'), 'lớp mới: owner_id là giáo viên');
select is((select class_name || '|' || school_year || '|' || teacher_name from public.classes where id = (select id from ny)), '6A|2027 – 2028|Cô T mới', 'lớp mới: tên, năm học, giáo viên');
select is((select school_name || '|' || slogan || '|' || theme from public.classes where id = (select id from ny)), 'Trường A|Cùng nhau|pink', 'lớp mới: trường, slogan, theme lấy từ lớp cũ khi không gửi');
select is((select class_id from public.profiles where id = pg_temp.u('d1')), (select id from ny), 'giáo viên chuyển sang lớp mới');
select isnt((select archived_at from public.classes where id = pg_temp.u('c1')), null, 'lớp cũ có archived_at');
select is((select archived_at from public.classes where id = (select id from ny)), null, 'lớp mới chưa lưu trữ');
select is((select pg_temp.cnt('students', (select id from ny))), 0::bigint, 'lớp mới có 0 học sinh');
select is((select pg_temp.cnt('star_transactions', (select id from ny))), 0::bigint, 'lớp mới có 0 giao dịch sao');
select is((select count(*)::int from public.students where class_id = pg_temp.u('c1')), 2, 'học sinh cũ vẫn ở lớp cũ');
select is((select pg_temp.cnt('subjects', (select id from ny))), pg_temp.cnt('subjects', pg_temp.u('c1')), 'số môn học bằng lớp cũ');
select is((select pg_temp.cnt('timetable_slots', (select id from ny))), pg_temp.cnt('timetable_slots', pg_temp.u('c1')), 'số tiết thời khóa biểu bằng lớp cũ');
select is((select pg_temp.cnt('star_criteria', (select id from ny))), pg_temp.cnt('star_criteria', pg_temp.u('c1')), 'số tiêu chí bằng lớp cũ');
select is((select pg_temp.cnt('rewards', (select id from ny))), pg_temp.cnt('rewards', pg_temp.u('c1')), 'số quà bằng lớp cũ');
select is((select pg_temp.cnt('avatar_library', (select id from ny))), pg_temp.cnt('avatar_library', pg_temp.u('c1')), 'số avatar bằng lớp cũ');
select is((select pg_temp.cnt('missions', (select id from ny))), pg_temp.cnt('missions', pg_temp.u('c1')), 'số nhiệm vụ bằng lớp cũ');
select is((select pg_temp.cnt('badges', (select id from ny))), pg_temp.cnt('badges', pg_temp.u('c1')), 'số huy hiệu bằng lớp cũ');
select is((select count(*)::int from public.rewards o join public.rewards n on n.class_id = (select id from ny) and n.name = o.name
            where o.class_id = pg_temp.u('c1') and n.stock = o.stock), 2, 'quà chép với stock như cũ');
select is((select count(*)::int from public.rewards where class_id = (select id from ny) and id in (pg_temp.u('21'), pg_temp.u('22'))), 0, 'id quà là id mới');
select is((select count(*)::int from public.timetable_slots t join public.subjects s on s.class_id = t.class_id and s.id = t.subject_id
            where t.class_id = (select id from ny)), 2, 'tiết thời khóa biểu trỏ về môn của lớp mới');
select is((select count(*)::int from public.rewards where class_id = (select id from ny) and image_path like (select id::text from ny) || '/rewards/%'), 1, 'ảnh quà đổi sang thư mục lớp mới');
select is((select logo_path from public.classes where id = (select id from ny)), (select id::text from ny) || '/branding/logo.png', 'logo trường đổi sang thư mục lớp mới');
select is((select weekly_redeem_limit || '|' || timetable_saturday || '|' || require_approval || '|' || star_steps::text
             from public.class_settings where class_id = (select id from ny)), '7|true|false|{1,2}', 'cờ cài đặt chép từ lớp cũ');
select is((select count(*)::int from public.class_settings where class_id = (select id from ny)), 1, 'lớp mới có đúng một dòng cài đặt');
select is((select avatar_id from public.profiles where id = pg_temp.u('d1')),
          (select id from public.avatar_library where class_id = (select id from ny) and label = 'preset 1'), 'avatar giáo viên trỏ về bản sao ở lớp mới');
select is((select count(*)::int from public.audit_logs where class_id = (select id from ny) and action = 'school_year_opened'), 1, 'ghi nhật ký school_year_opened');
select is((select count(*)::int from public.audit_logs where class_id = pg_temp.u('c1') and action = 'class_archived'), 1, 'ghi nhật ký class_archived cho lớp cũ');

select is((select count(*)::int from public.subjects where class_id = (select id from ny) and is_demo and name = 'Văn'), 1, 'bản sao môn giữ is_demo của dòng gốc (true)');
select is((select count(*)::int from public.subjects where class_id = (select id from ny) and not is_demo and name = 'Toán'), 1, 'bản sao môn giữ is_demo của dòng gốc (false)');
select is((select count(*)::int from public.rewards where class_id = (select id from ny) and is_demo), 1, 'bản sao quà giữ is_demo');

-- Review Focus 4
select is((select status::text from public.reward_requests where id = pg_temp.u('31')), 'rejected', 'yêu cầu pending bị từ chối');
select is((select pg_temp.avail(pg_temp.u('a1'))), 10::bigint, 'sao khả dụng của học sinh về như trước khi gửi yêu cầu (10)');
select is((select count(*)::int from public.star_transactions where reward_request_id = pg_temp.u('31') and kind = 'release'), 1, 'sao đang giữ được trả bằng một dòng release');
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d3'));
select is((select count(*)::int from public.my_profile_summary()), 0, 'học sinh năm cũ gọi my_profile_summary không còn dữ liệu');
select is((select status from public.my_student_session()), 'archived_class', 'học sinh năm cũ có trạng thái archived_class (không đăng nhập được)');
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"x","class_name":"y"}'::jsonb)$$, 'P0001', 'not_allowed', 'học sinh năm cũ vẫn không mở được năm học');
-- Giáo viên vào lớp mới thấy trống học sinh.
select pg_temp.as_user(pg_temp.u('d1'));
select is((select count(*)::int from public.students), 0, 'giáo viên vào lớp mới: không thấy học sinh nào');
select is((select count(*)::int from public.my_archived_classes()), 1, 'năm học cũ nằm trong danh sách lưu trữ');

-- Chép một phần: chỉ môn học; cài đặt về mặc định; tiêu chí không có.
-- Gửi trùng (form còn trỏ lớp cũ): stale_class, không tạo thêm lớp nào.
create temp table cls_n as select count(*) as n from public.classes;
grant select on cls_n to public;
select throws_ok($$select public.start_new_school_year('{"expected_class_id":"00000000-0000-0000-0000-0000000000c1","school_year":"2028 – 2029","class_name":"7A"}'::jsonb)$$, 'P0001', 'stale_class', 'gửi lần hai với lớp cũ: stale_class');
select is((select count(*) from public.classes), (select n from cls_n), 'gửi trùng không tạo thêm lớp (đúng một lớp mới)');
select is((select count(*)::int from public.classes where owner_id = pg_temp.u('d1') and archived_at is null), 1, 'sau gửi trùng giáo viên vẫn chỉ có một lớp đang dùng');
select throws_ok($$select public.start_new_school_year('{"school_year":"2028 – 2029","class_name":"7A"}'::jsonb)$$, 'P0001', 'invalid_input', 'thiếu expected_class_id: invalid_input');
select set_config('app.ny2', public.start_new_school_year(jsonb_build_object('expected_class_id', (select id from ny), 'school_year', '2028 – 2029', 'class_name', '7A', 'school_name', 'Trường mới', 'copy', jsonb_build_array('subjects')))::text, true);
reset role;
select is((select pg_temp.cnt('subjects', current_setting('app.ny2')::uuid)), 2::bigint, 'chép một phần: có 2 môn');
select is((select pg_temp.cnt('star_criteria', current_setting('app.ny2')::uuid) + pg_temp.cnt('rewards', current_setting('app.ny2')::uuid)
                  + pg_temp.cnt('timetable_slots', current_setting('app.ny2')::uuid)), 0::bigint, 'chép một phần: không có tiêu chí, quà, tiết');
select is((select weekly_redeem_limit from public.class_settings where class_id = current_setting('app.ny2')::uuid), 2, 'không chép settings: cài đặt mặc định');
select is((select school_name from public.classes where id = current_setting('app.ny2')::uuid), 'Trường mới', 'school_name gửi lên thì dùng');
select is((select avatar_id from public.profiles where id = pg_temp.u('d1')), null, 'không chép avatar: avatar giáo viên về null');
select isnt((select archived_at from public.classes where id = (select id from ny)), null, 'lớp liền trước được lưu trữ');
select is((select count(*)::int from public.classes where owner_id = pg_temp.u('d1') and archived_at is null), 1, 'giáo viên chỉ còn một lớp đang dùng');
select is((select count(*)::int from public.classes), (select n::int from base) + 2, 'thêm đúng 2 lớp mới');

-- ===== dữ liệu thử: lớp c2 (xóa dữ liệu demo) =====
insert into public.avatar_library (id, class_id, kind, preset, label, is_demo) values
  (pg_temp.u('e11'), pg_temp.u('c2'), 'preset', '{"bg":"#111"}', 'demo dùng bởi demo', true),
  (pg_temp.u('e12'), pg_temp.u('c2'), 'preset', '{"bg":"#222"}', 'demo dùng bởi thật', true),
  (pg_temp.u('e13'), pg_temp.u('c2'), 'preset', '{"bg":"#333"}', 'demo không ai dùng', true),
  (pg_temp.u('e14'), pg_temp.u('c2'), 'preset', '{"bg":"#444"}', 'thật', false);
insert into public.students (id, class_id, code, roll_no, full_name, avatar_id, is_demo) values
  (pg_temp.u('b1'), pg_temp.u('c2'), 'D01', 1, 'Demo 1', pg_temp.u('e11'), true),
  (pg_temp.u('b2'), pg_temp.u('c2'), 'D02', 2, 'Demo 2', null, true),
  (pg_temp.u('b3'), pg_temp.u('c2'), 'R01', 3, 'Thật 1', pg_temp.u('e12'), false);
update public.profiles set class_id = pg_temp.u('c2') where id = pg_temp.u('d2');
insert into public.profiles (id, class_id, role, username, display_name, student_id) values
  (pg_temp.u('d5'), pg_temp.u('c2'), 'student', 'hs.demo1', 'Demo 1', pg_temp.u('b1')),
  (pg_temp.u('d6'), pg_temp.u('c2'), 'student', 'hs.that1', 'Thật 1', pg_temp.u('b3'));
insert into public.groups (id, class_id, name, is_demo) values
  (pg_temp.u('f1'), pg_temp.u('c2'), 'Tổ demo', true), (pg_temp.u('f2'), pg_temp.u('c2'), 'Tổ demo có bạn thật', true);
insert into public.group_members (class_id, group_id, student_id, is_demo) values
  (pg_temp.u('c2'), pg_temp.u('f1'), pg_temp.u('b1'), true), (pg_temp.u('c2'), pg_temp.u('f1'), pg_temp.u('b2'), true),
  (pg_temp.u('c2'), pg_temp.u('f2'), pg_temp.u('b3'), false);
insert into public.star_criteria (id, class_id, label, kind, default_points, is_demo) values
  (pg_temp.u('ca1'), pg_temp.u('c2'), 'Demo dùng bởi thật', 'award', 1, true),
  (pg_temp.u('ca2'), pg_temp.u('c2'), 'Demo chỉ demo dùng', 'award', 1, true),
  (pg_temp.u('ca3'), pg_temp.u('c2'), 'Thật', 'award', 1, false);
insert into public.rewards (id, class_id, name, cost, stock, is_demo) values
  (pg_temp.u('cb1'), pg_temp.u('c2'), 'Quà demo thật xin', 5, 3, true),
  (pg_temp.u('cb2'), pg_temp.u('c2'), 'Quà demo demo xin', 5, 3, true),
  (pg_temp.u('cb3'), pg_temp.u('c2'), 'Quà thật', 5, 3, false);
insert into public.subjects (id, class_id, name, is_demo) values
  (pg_temp.u('cc1'), pg_temp.u('c2'), 'Môn demo có tiết thật', true),
  (pg_temp.u('cc2'), pg_temp.u('c2'), 'Môn demo', true),
  (pg_temp.u('cc3'), pg_temp.u('c2'), 'Môn thật', false);
insert into public.timetable_slots (class_id, weekday, session, period, subject_id, is_demo) values
  (pg_temp.u('c2'), 1, 'morning', 1, pg_temp.u('cc1'), false),
  (pg_temp.u('c2'), 1, 'morning', 2, pg_temp.u('cc2'), true),
  (pg_temp.u('c2'), 1, 'morning', 3, pg_temp.u('cc3'), false);
insert into public.missions (id, class_id, name, period, reward_stars, is_demo) values
  (pg_temp.u('cd1'), pg_temp.u('c2'), 'NV demo có lượt thật', 'week', 1, true),
  (pg_temp.u('cd2'), pg_temp.u('c2'), 'NV demo', 'week', 1, true),
  (pg_temp.u('cd3'), pg_temp.u('c2'), 'NV thật', 'week', 1, false);
insert into public.badges (id, class_id, name, is_demo) values
  (pg_temp.u('ce1'), pg_temp.u('c2'), 'HH demo có bạn thật', true),
  (pg_temp.u('ce2'), pg_temp.u('c2'), 'HH demo', true),
  (pg_temp.u('ce3'), pg_temp.u('c2'), 'HH thật', false);
insert into public.announcements (id, class_id, title, is_demo) values
  (pg_temp.u('cf1'), pg_temp.u('c2'), 'TB demo', true), (pg_temp.u('cf2'), pg_temp.u('c2'), 'TB thật', false);
insert into public.attendance (class_id, student_id, date, status, is_demo) values
  (pg_temp.u('c2'), pg_temp.u('b1'), '2026-10-30', 'present', true), (pg_temp.u('c2'), pg_temp.u('b3'), '2026-10-30', 'present', false);
-- Sổ sao: demo (kể cả hoàn tác), thật. Demo có yêu cầu đang giữ sao.
insert into public.star_transactions (id, class_id, student_id, delta, kind, criterion_id, batch_id, is_demo) values
  (pg_temp.u('c11'), pg_temp.u('c2'), pg_temp.u('b1'), 10, 'award', pg_temp.u('ca2'), pg_temp.u('91'), true),
  (pg_temp.u('c12'), pg_temp.u('c2'), pg_temp.u('b2'), 4, 'award', pg_temp.u('ca2'), pg_temp.u('92'), true),
  (pg_temp.u('c14'), pg_temp.u('c2'), pg_temp.u('b3'), 9, 'award', pg_temp.u('ca1'), pg_temp.u('93'), false);
insert into public.star_transactions (id, class_id, student_id, delta, kind, reverses_id, batch_id, is_demo) values
  (pg_temp.u('c13'), pg_temp.u('c2'), pg_temp.u('b2'), -4, 'reversal', pg_temp.u('c12'), pg_temp.u('94'), true);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost, status, is_demo) values
  (pg_temp.u('c91'), pg_temp.u('c2'), pg_temp.u('b1'), pg_temp.u('cb2'), 5, 'pending', true),
  (pg_temp.u('c92'), pg_temp.u('c2'), pg_temp.u('b3'), pg_temp.u('cb1'), 5, 'pending', false);
insert into public.star_transactions (id, class_id, student_id, delta, kind, reward_request_id, is_demo) values
  (pg_temp.u('c15'), pg_temp.u('c2'), pg_temp.u('b1'), -5, 'reserve', pg_temp.u('c91'), true),
  (pg_temp.u('c16'), pg_temp.u('c2'), pg_temp.u('b3'), -5, 'reserve', pg_temp.u('c92'), false);
insert into public.mission_completions (class_id, mission_id, student_id, period_key, star_transaction_id, is_demo) values
  (pg_temp.u('c2'), pg_temp.u('cd2'), pg_temp.u('b1'), '2026-W44', pg_temp.u('c11'), true),
  (pg_temp.u('c2'), pg_temp.u('cd1'), pg_temp.u('b3'), '2026-W44', null, false);
insert into public.student_badges (class_id, badge_id, student_id, is_demo) values
  (pg_temp.u('c2'), pg_temp.u('ce2'), pg_temp.u('b1'), true), (pg_temp.u('c2'), pg_temp.u('ce1'), pg_temp.u('b3'), false);

create temp table real_before as
  select (select pg_temp.avail(pg_temp.u('b3'))) as avail, (select count(*) from public.star_transactions where student_id = pg_temp.u('b3')) as ledger;
grant select on real_before to public;
create temp table class1_before as
  select (select count(*) from public.students where class_id = pg_temp.u('c1')) as students,
         (select count(*) from public.star_transactions where class_id = pg_temp.u('c1')) as ledger;
grant select on class1_before to public;

-- ===== chốt chặn sổ sao =====
-- Không có cờ: ngay cả vai chủ sở hữu cũng không xóa được dòng của học sinh demo.
select throws_ok($$delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b1'$$, 'P0001', 'ledger_immutable', 'không có cờ: xóa sổ sao của học sinh demo bị chặn');
-- Có cờ nhưng dòng thuộc học sinh thật: vẫn bị chặn.
select set_config('app.demo_purge', 'on', true);
select throws_ok($$delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b3'$$, 'P0001', 'ledger_immutable', 'có cờ: sổ sao của học sinh thật vẫn bị chặn');
select throws_ok($$update public.star_transactions set note = 'x' where student_id = '00000000-0000-0000-0000-0000000000b1'$$, 'P0001', 'ledger_immutable', 'có cờ: UPDATE vẫn bị chặn');
-- Có cờ, dòng demo, nhưng vai API (authenticated/anon/service_role): không xóa được gì.
do $$ begin
  set local role authenticated;
  delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b1';
exception when others then null; end $$;
reset role;
do $$ begin
  set local role service_role;
  delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b1';
exception when others then null; end $$;
reset role;
do $$ begin
  set local role anon;
  delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b1';
exception when others then null; end $$;
reset role;
select is((select count(*)::int from public.star_transactions where student_id = pg_temp.u('b1')), 2, 'có cờ nhưng vai API: sổ sao demo vẫn nguyên (2 dòng)');
select set_config('app.demo_purge', 'off', true);

-- ===== xóa dữ liệu demo =====
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d2'));
select set_config('app.dd', public.delete_demo_data()::text, true);
reset role;
create temp table dd as select current_setting('app.dd')::jsonb as j;
grant select on dd to public;

select is((select (j ->> 'deletedStudents')::int from dd), 2, 'deletedStudents = 2');
select is((select (j ->> 'keptCatalog')::int from dd), 7, 'keptCatalog = 7 (quà, môn, tiêu chí, huy hiệu, nhiệm vụ, tổ, avatar còn dùng)');
select is((select jsonb_array_length(j -> 'authUserIds') from dd), 1, 'authUserIds có 1 tài khoản (hs.demo1)');
select is((select j #>> '{authUserIds,0}' from dd), pg_temp.u('d5')::text, 'authUserIds là tài khoản của học sinh demo');
select is((select count(*)::int from public.students where class_id = pg_temp.u('c2') and is_demo), 0, 'còn 0 học sinh demo');
select is((select count(*)::int from public.students where class_id = pg_temp.u('c2')), 1, 'học sinh thật còn nguyên');
select is((select count(*)::int from public.profiles where id = pg_temp.u('d5')), 0, 'profile học sinh demo đã xóa');
select is((select count(*)::int from public.profiles where id in (pg_temp.u('d2'), pg_temp.u('d6'))), 2, 'profile giáo viên và học sinh thật còn nguyên');
select is((select pg_temp.avail(pg_temp.u('b3'))), (select avail from real_before), 'sao của học sinh thật không đổi');
select is((select count(*) from public.star_transactions where student_id = pg_temp.u('b3')), (select ledger from real_before), 'sổ sao của học sinh thật còn đủ dòng');
select is((select count(*)::int from public.star_transactions where student_id in (pg_temp.u('b1'), pg_temp.u('b2'))), 0, 'sổ sao của học sinh demo đã xóa (kể cả hoàn tác)');
select is((select count(*)::int from public.reward_requests where id = pg_temp.u('c91')), 0, 'yêu cầu của học sinh demo đã xóa');
select is((select count(*)::int from public.reward_requests where id = pg_temp.u('c92')), 1, 'yêu cầu của học sinh thật còn');
select is((select array_agg(id order by id) from public.rewards where class_id = pg_temp.u('c2')), array[pg_temp.u('cb1'), pg_temp.u('cb3')], 'quà demo mà học sinh thật có yêu cầu được giữ lại; quà demo khác bị xóa');
select is((select array_agg(id order by id) from public.subjects where class_id = pg_temp.u('c2')), array[pg_temp.u('cc1'), pg_temp.u('cc3')], 'môn demo còn tiết thật được giữ lại');
select is((select count(*)::int from public.timetable_slots where class_id = pg_temp.u('c2')), 2, 'tiết demo bị xóa, tiết thật còn');
select is((select array_agg(id order by id) from public.star_criteria where class_id = pg_temp.u('c2')), array[pg_temp.u('ca1'), pg_temp.u('ca3')], 'tiêu chí demo còn được sổ thật dùng được giữ lại');
select is((select array_agg(id order by id) from public.missions where class_id = pg_temp.u('c2')), array[pg_temp.u('cd1'), pg_temp.u('cd3')], 'nhiệm vụ demo còn lượt hoàn thành thật được giữ lại');
select is((select array_agg(id order by id) from public.badges where class_id = pg_temp.u('c2')), array[pg_temp.u('ce1'), pg_temp.u('ce3')], 'huy hiệu demo còn học sinh thật được giữ lại');
select is((select array_agg(id order by id) from public.groups where class_id = pg_temp.u('c2')), array[pg_temp.u('f2')], 'tổ demo còn bạn thật được giữ lại');
select is((select array_agg(id order by id) from public.avatar_library where class_id = pg_temp.u('c2')), array[pg_temp.u('e12'), pg_temp.u('e14')], 'avatar demo còn được dùng được giữ lại');
select is((select count(*)::int from public.announcements where class_id = pg_temp.u('c2')), 1, 'thông báo demo đã xóa');
select is((select count(*)::int from public.attendance where class_id = pg_temp.u('c2')), 1, 'điểm danh của học sinh demo đã xóa');
select is((select count(*)::int from public.group_members where class_id = pg_temp.u('c2')), 1, 'thành viên tổ của học sinh demo đã xóa');
select is((select count(*)::int from public.mission_completions where class_id = pg_temp.u('c2')), 1, 'lượt nhiệm vụ của học sinh demo đã xóa');
select is((select count(*)::int from public.student_badges where class_id = pg_temp.u('c2')), 1, 'huy hiệu của học sinh demo đã xóa');
select is((select count(*)::int from public.class_settings where class_id = pg_temp.u('c2')), 1, 'cài đặt lớp còn nguyên');
select is((select count(*) from public.students where class_id = pg_temp.u('c1')), (select students from class1_before), 'lớp khác không bị đụng tới (học sinh)');
select is((select count(*) from public.star_transactions where class_id = pg_temp.u('c1')), (select ledger from class1_before), 'lớp khác không bị đụng tới (sổ sao)');
select is((select count(*)::int from public.audit_logs where class_id = pg_temp.u('c2') and action = 'demo_data_deleted'), 1, 'ghi nhật ký demo_data_deleted');
select is(coalesce(current_setting('app.demo_purge', true), ''), 'off', 'cờ app.demo_purge đã tắt sau khi xóa');
select throws_ok($$delete from public.star_transactions where student_id = '00000000-0000-0000-0000-0000000000b3'$$, 'P0001', 'ledger_immutable', 'sau khi xóa, sổ sao lại bất biến');

-- Chạy lần nữa: không còn dữ liệu demo, vẫn chạy được và trả 0.
set local role authenticated;
select pg_temp.as_user(pg_temp.u('d2'));
select is((select (public.delete_demo_data() ->> 'deletedStudents')::int), 0, 'chạy lại: deletedStudents = 0');
reset role;

select * from finish();
rollback;
