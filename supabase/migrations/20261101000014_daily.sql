-- Đợt 4: điểm danh hằng ngày, ràng buộc môn học / thời khóa biểu.

alter table public.class_settings add column timetable_saturday boolean not null default false;

-- Xóa môn đang có trong thời khóa biểu thì bị chặn (23503), không còn tự đặt ô về null.
alter table public.timetable_slots drop constraint timetable_slots_class_id_subject_id_fkey;
alter table public.timetable_slots
  add constraint timetable_slots_class_id_subject_id_fkey
  foreign key (class_id, subject_id) references public.subjects (class_id, id) on delete restrict;

create unique index subjects_class_lower_name_key on public.subjects (class_id, lower(name));

-- Lưu điểm danh một ngày. p_rows: [{student_id, status}], status null = xóa dòng của ngày đó.
-- Không khóa students: FK từ attendance chỉ lấy FOR KEY SHARE.
create function public.save_attendance(p_date date, p_rows jsonb) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_n int;
  v_ids uuid[];
  v_del int;
  v_up int;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  if p_date is null then raise exception 'invalid_rows'; end if;
  if p_date > v_today then raise exception 'future_date'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'invalid_rows'; end if;
  v_n := jsonb_array_length(p_rows);
  if v_n > 100 then raise exception 'invalid_rows'; end if;
  if v_n = 0 then return 0; end if;

  create temp table pg_temp.att_in (student_id uuid not null, status public.attendance_status) on commit drop;

  begin
    insert into pg_temp.att_in (student_id, status)
    select (e->>'student_id')::uuid,
           case when jsonb_typeof(e->'status') = 'null' or e->'status' is null then null
                else (e->>'status')::public.attendance_status end
      from jsonb_array_elements(p_rows) e;
  exception when others then
    raise exception 'invalid_rows';
  end;

  if (select count(distinct student_id) from pg_temp.att_in) <> v_n then raise exception 'invalid_rows'; end if;

  if exists (
    select 1 from pg_temp.att_in i
     where not exists (select 1 from public.students s
                        where s.id = i.student_id and s.class_id = v_class and s.archived_at is null)
  ) then raise exception 'student_not_found'; end if;

  delete from public.attendance a
   using pg_temp.att_in i
   where i.status is null and a.student_id = i.student_id and a.date = p_date and a.class_id = v_class;
  get diagnostics v_del = row_count;

  insert into public.attendance (class_id, student_id, date, status)
  select v_class, i.student_id, p_date, i.status from pg_temp.att_in i where i.status is not null
  on conflict (student_id, date) do update set status = excluded.status;
  get diagnostics v_up = row_count;

  insert into public.audit_logs (class_id, actor_id, action, entity, payload)
  values (v_class, (select auth.uid()), 'attendance.save', 'attendance',
          jsonb_build_object('date', p_date, 'count', v_del + v_up));

  drop table pg_temp.att_in;
  return v_del + v_up;
end;
$$;

revoke execute on function public.save_attendance(date, jsonb) from public, anon;
grant execute on function public.save_attendance(date, jsonb) to authenticated;
