begin;
select plan(45);

select has_table('public', t, 'bảng ' || t) from unnest(array[
  'classes','profiles','students','groups','group_members','star_criteria',
  'star_transactions','rewards','reward_requests','attendance','subjects',
  'timetable_slots','announcements','missions','mission_completions','badges',
  'student_badges','avatar_library','class_settings','audit_logs']) as t;

select col_is_unique('public', 'profiles', array['username']);
select col_is_unique('public', 'attendance', array['student_id','date']);
select col_is_unique('public', 'star_transactions', array['reverses_id']);
select col_is_unique('public', 'timetable_slots', array['class_id','weekday','session','period']);
select col_is_unique('public', 'group_members', array['class_id','student_id']);
select col_is_unique('public', 'student_badges', array['badge_id','student_id']);

select has_index('public', 'star_transactions', 'star_transactions_student_id_created_at_idx', array['student_id','created_at']);
select has_index('public', 'attendance', 'attendance_student_id_date_key', array['student_id','date']);

-- dữ liệu nền (chạy với quyền postgres, không RLS)
insert into public.classes (id, school_name, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'Trường thử', '5A');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'Học sinh thử');

select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 0, 'award')
$$, '23514', null, 'delta = 0 bị chặn');

select throws_ok($$
  insert into public.timetable_slots (class_id, weekday, session, period)
  values ('00000000-0000-0000-0000-0000000000c1', 7, 'morning', 1)
$$, '23514', null, 'weekday = 7 bị chặn');

select throws_ok($$
  insert into public.timetable_slots (class_id, weekday, session, period)
  values ('00000000-0000-0000-0000-0000000000c1', 1, 'afternoon', 4)
$$, '23514', null, 'buổi chiều tiết 4 bị chặn');

select throws_ok($$
  insert into public.rewards (class_id, name, cost, stock)
  values ('00000000-0000-0000-0000-0000000000c1', 'Quà', 5, -1)
$$, '23514', null, 'stock = -1 bị chặn');

select throws_ok($$
  insert into public.rewards (class_id, name, cost, stock)
  values ('00000000-0000-0000-0000-0000000000c1', 'Quà', 0, 1)
$$, '23514', null, 'cost = 0 bị chặn');

insert into public.classes (id, school_name, class_name) values
  ('00000000-0000-0000-0000-0000000000c2', 'Trường khác', '5B');
insert into public.groups (id, class_id, name) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Tổ 1');
insert into public.rewards (id, class_id, name, cost, stock) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Quà nền', 5, 1);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 5);
insert into public.star_transactions (id, class_id, student_id, delta, kind, batch_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1',
   '00000000-0000-0000-0000-0000000000a1', 2, 'award', gen_random_uuid());

select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind, batch_id)
  values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1', 1, 'award', gen_random_uuid())
$$, '23503', null, 'giao dịch sao khác lớp với học sinh bị chặn');

select throws_ok($$
  insert into public.group_members (class_id, group_id, student_id)
  values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1')
$$, '23503', null, 'thành viên tổ khác lớp bị chặn');

select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'penalty')
$$, '23514', null, 'penalty dương bị chặn');
select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -1, 'award')
$$, '23514', null, 'award âm bị chặn');
select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'reversal')
$$, '23514', null, 'reversal thiếu reverses_id bị chặn');
select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'award', '00000000-0000-0000-0000-0000000000f1')
$$, '23514', null, 'award có reverses_id bị chặn');
select throws_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -5, 'reserve')
$$, '23514', null, 'reserve thiếu reward_request_id bị chặn');

select lives_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind, batch_id) values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 3, 'award', gen_random_uuid()),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -1, 'penalty', gen_random_uuid())
$$, 'award dương và penalty âm hợp lệ');
select lives_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id) values
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -5, 'reserve', '00000000-0000-0000-0000-0000000000e1'),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 5, 'release', '00000000-0000-0000-0000-0000000000e1'),
    ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -5, 'redeem', '00000000-0000-0000-0000-0000000000e1')
$$, 'reserve, release, redeem hợp lệ');
select lives_ok($$
  insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'reversal', '00000000-0000-0000-0000-0000000000f1', gen_random_uuid())
$$, 'reversal có reverses_id hợp lệ');

select lives_ok($$
  insert into public.timetable_slots (class_id, weekday, session, period) values
    ('00000000-0000-0000-0000-0000000000c1', 6, 'afternoon', 3)
$$, 'thứ 7 buổi chiều tiết 3 hợp lệ');
select lives_ok($$
  insert into public.rewards (class_id, name, cost, stock)
  values ('00000000-0000-0000-0000-0000000000c1', 'Quà biên', 1, 0)
$$, 'stock 0, cost 1 hợp lệ');

select * from finish();
rollback;
