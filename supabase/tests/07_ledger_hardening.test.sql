begin;
select plan(14);

insert into public.classes (id, class_name) values
  ('00000000-0000-0000-0000-0000000000c1', '5A'),
  ('00000000-0000-0000-0000-0000000000c2', '5B');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'HS01', 1, 'A'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'HS02', 2, 'B');
insert into public.star_criteria (id, class_id, label, kind) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000c1', 'Cộng', 'award'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'Trừ', 'penalty');
insert into public.rewards (id, class_id, name, cost) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Quà', 3);
insert into public.reward_requests (id, class_id, student_id, reward_id, cost) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 3);
insert into public.star_transactions (id, class_id, student_id, delta, kind, batch_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 3, 'award', gen_random_uuid());
insert into public.star_transactions (id, class_id, student_id, delta, kind, reward_request_id) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -3, 'reserve', '00000000-0000-0000-0000-0000000000b2');

select has_column('public', 'star_transactions', 'batch_id', 'có cột batch_id');

select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 3, 'reversal', '00000000-0000-0000-0000-0000000000f2', gen_random_uuid())$$,
  'P0001', 'invalid_reversal', 'reversal của reserve');
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -2, 'reversal', '00000000-0000-0000-0000-0000000000f1', gen_random_uuid())$$,
  'P0001', 'invalid_reversal', 'reversal sai delta');
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', -3, 'reversal', '00000000-0000-0000-0000-0000000000f1', gen_random_uuid())$$,
  'P0001', 'invalid_reversal', 'reversal khác học sinh');
select lives_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -3, 'reversal', '00000000-0000-0000-0000-0000000000f1', gen_random_uuid())$$,
  'reversal đúng');

select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, criterion_id, batch_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'award', '00000000-0000-0000-0000-0000000000e2', gen_random_uuid())$$,
  'P0001', 'criterion_mismatch', 'award với tiêu chí penalty');
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, criterion_id) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -1, 'reserve', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000e1')$$,
  'P0001', 'criterion_mismatch', 'reserve có criterion_id');

select throws_ok($$insert into public.students (class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000c1', 'HS01', 9, 'Trùng')$$, '23505', null, 'trùng mã trong lớp');
select lives_ok($$insert into public.students (class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000c2', 'HS01', 1, 'Lớp khác')$$, 'cùng mã ở lớp khác');

insert into public.groups (id, class_id, name) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'Tổ X');
insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1', 'leader');
select throws_ok($$insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2', 'leader')$$,
  '23505', null, 'hai leader cùng tổ');
insert into public.students (id, class_id, code, roll_no, full_name) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'HS03', 3, 'C');
insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a2', 'deputy');
select throws_ok($$insert into public.group_members (class_id, group_id, student_id, role) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a3', 'deputy')$$,
  '23505', null, 'hai deputy cùng tổ');

create table public.__t (id int);
select ok(not has_table_privilege('anon', 'public.__t', 'truncate') and not has_table_privilege('authenticated', 'public.__t', 'truncate'), 'bảng mới: anon/authenticated không có TRUNCATE');

select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 1, 'award')$$,
  '23514', null, 'award không có batch_id bị chặn');
select throws_ok($$insert into public.star_transactions (class_id, student_id, delta, kind) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', -1, 'penalty')$$,
  '23514', null, 'penalty không có batch_id bị chặn');

select * from finish();
rollback;
