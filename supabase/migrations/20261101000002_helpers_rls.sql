-- Hàm trợ giúp RLS (schema private, không lộ qua API) và chính sách RLS.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.my_class_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.class_id from public.profiles p where p.id = (select auth.uid())
$$;

create function private.is_teacher() returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.role = 'teacher' from public.profiles p where p.id = (select auth.uid())),
    false)
$$;

create function private.my_student_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.student_id from public.profiles p where p.id = (select auth.uid())
$$;

-- Đọc một cờ boolean trong class_settings của lớp mình; không có cờ hoặc không có lớp thì false.
create function private.setting_on(flag text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select (to_jsonb(cs) ->> flag)::boolean
       from public.class_settings cs
      where cs.class_id = (select private.my_class_id())),
    false)
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Bật RLS trên mọi bảng
alter table public.classes enable row level security;
alter table public.avatar_library enable row level security;
alter table public.students enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.star_criteria enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_requests enable row level security;
alter table public.star_transactions enable row level security;
alter table public.attendance enable row level security;
alter table public.subjects enable row level security;
alter table public.timetable_slots enable row level security;
alter table public.announcements enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.class_settings enable row level security;
alter table public.audit_logs enable row level security;

-- anon không được ghi vào bảng nào
revoke insert, update, delete on all tables in schema public from anon;

-- Giáo viên: select/insert/update trên mọi bảng có class_id của lớp mình
do $$
declare
  t text;
begin
  foreach t in array array[
    'avatar_library','students','profiles','groups','group_members','star_criteria',
    'rewards','reward_requests','star_transactions','attendance','subjects',
    'timetable_slots','announcements','missions','mission_completions','badges',
    'student_badges','class_settings']
  loop
    execute format($f$create policy teacher_select on public.%I for select to authenticated
      using (private.is_teacher() and class_id = (select private.my_class_id()))$f$, t);
    execute format($f$create policy teacher_insert on public.%I for insert to authenticated
      with check (private.is_teacher() and class_id = (select private.my_class_id()))$f$, t);
    execute format($f$create policy teacher_update on public.%I for update to authenticated
      using (private.is_teacher() and class_id = (select private.my_class_id()))
      with check (private.is_teacher() and class_id = (select private.my_class_id()))$f$, t);
  end loop;

  -- delete chỉ cho ba bảng cấu hình nhẹ
  foreach t in array array['group_members','timetable_slots','subjects']
  loop
    execute format($f$create policy teacher_delete on public.%I for delete to authenticated
      using (private.is_teacher() and class_id = (select private.my_class_id()))$f$, t);
  end loop;
end $$;

-- classes theo id
create policy teacher_select on public.classes for select to authenticated
  using (private.is_teacher() and id = (select private.my_class_id()));
create policy teacher_insert on public.classes for insert to authenticated
  with check (private.is_teacher() and id = (select private.my_class_id()));
create policy teacher_update on public.classes for update to authenticated
  using (private.is_teacher() and id = (select private.my_class_id()))
  with check (private.is_teacher() and id = (select private.my_class_id()));

-- audit_logs: giáo viên chỉ đọc; ghi qua hàm security definer
create policy teacher_select on public.audit_logs for select to authenticated
  using (private.is_teacher() and class_id = (select private.my_class_id()));

-- Học sinh: chỉ select
create policy self_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy student_select on public.students for select to authenticated
  using (id = (select private.my_student_id()));

-- star_transactions: học sinh không có policy nào; chỉ đọc qua view v_my_star_history / v_student_stars
-- (đọc trực tiếp sẽ lộ note và criterion_id của giao dịch trừ sao).

create policy student_select on public.reward_requests for select to authenticated
  using (student_id = (select private.my_student_id()) and (select private.setting_on('student_can_view_rewards')));

create policy student_select on public.rewards for select to authenticated
  using (class_id = (select private.my_class_id()) and not hidden
         and (select private.setting_on('student_can_view_rewards')));

create policy student_select on public.student_badges for select to authenticated
  using (student_id = (select private.my_student_id()));

create policy student_select on public.attendance for select to authenticated
  using (student_id = (select private.my_student_id()) and (select private.setting_on('student_can_view_attendance')));

create policy student_select on public.subjects for select to authenticated
  using (class_id = (select private.my_class_id()) and (select private.setting_on('student_can_view_timetable')));

create policy student_select on public.timetable_slots for select to authenticated
  using (class_id = (select private.my_class_id()) and (select private.setting_on('student_can_view_timetable')));

create policy student_select on public.announcements for select to authenticated
  using (class_id = (select private.my_class_id()) and archived_at is null
         and (select private.setting_on('student_can_view_news')));

create policy student_select on public.badges for select to authenticated
  using (class_id = (select private.my_class_id()));

create policy student_select on public.avatar_library for select to authenticated
  using (class_id = (select private.my_class_id()));

create policy student_select on public.classes for select to authenticated
  using (id = (select private.my_class_id()));

create policy student_select on public.class_settings for select to authenticated
  using (class_id = (select private.my_class_id()));
