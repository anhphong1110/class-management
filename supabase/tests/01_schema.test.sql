begin;
select plan(33);

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
select has_index('public', 'attendance', 'attendance_student_id_date_idx', array['student_id','date']);

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

select * from finish();
rollback;
