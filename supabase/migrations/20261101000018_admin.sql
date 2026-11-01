-- Đợt 6, nền quản trị: cột và ràng buộc mới, lưu thông tin lớp / cài đặt lớp, thứ Bảy, hoàn tác nhiệm vụ,
-- gia cố lưu trữ học sinh, điểm danh và nhật ký quà.
-- Thứ tự khóa (xem 20261101000008): students (FOR NO KEY UPDATE) -> rewards -> reward_requests; groups -> group_members.

-- 1) Cột mới
alter table public.classes add column owner_id uuid references auth.users on delete set null;
create index on public.classes (owner_id);
update public.classes c
   set owner_id = (select p.id from public.profiles p
                    where p.class_id = c.id and p.role = 'teacher' order by p.created_at, p.id limit 1);

alter table public.profiles add column login_disabled boolean not null default false;

-- Mọi lớp phải có class_settings (lớp cũ thiếu thì bổ sung).
insert into public.class_settings (class_id) select c.id from public.classes c on conflict do nothing;

-- 2) Ràng buộc
create function private.valid_star_steps(p_steps int[]) returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_steps) between 1 and 8
     and not exists (select 1 from unnest(p_steps) x where x is null or x not between 1 and 50)
     and (select count(distinct x) from unnest(p_steps) x) = cardinality(p_steps)
$$;
revoke execute on function private.valid_star_steps(int[]) from public, anon;
-- Hàm thuần dùng trong CHECK: mọi vai ghi vào class_settings (kể cả service_role của script/admin) đều cần quyền gọi.
grant execute on function private.valid_star_steps(int[]) to authenticated, service_role;

alter table public.class_settings
  add constraint class_settings_weekly_redeem_limit_check check (weekly_redeem_limit between 1 and 20),
  add constraint class_settings_star_steps_check check (private.valid_star_steps(star_steps));

alter table public.profiles
  add constraint profiles_student_role_check check ((role = 'student') = (student_id is not null)),
  add constraint profiles_username_format_check check (username ~ '^[a-z0-9._]{3,32}$');

-- 3) Thêm lớp thì có ngay class_settings.
create function private.create_class_settings() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.class_settings (class_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function private.create_class_settings() from public, anon, authenticated;

create trigger classes_create_settings
  after insert on public.classes
  for each row execute function private.create_class_settings();

-- 4) archived_at của học sinh chỉ sửa qua archive_student: vai API (authenticated/anon) bị chặn, còn hàm
--    security definer archive_student chạy bằng vai chủ sở hữu nên qua được.
create function private.guard_student_archived_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and current_user in ('authenticated', 'anon') then
    raise exception 'use_archive_student';
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_student_archived_at() from public, anon, authenticated;

create trigger students_guard_archived_at
  before update of archived_at on public.students
  for each row execute function private.guard_student_archived_at();

create or replace function public.archive_student(p_student_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  r record;
  v_rejected int := 0;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class and s.archived_at is null for no key update;
  if not found then raise exception 'student_not_found'; end if;

  -- Đã giữ khóa học sinh; không yêu cầu mới nào của em chen vào được.
  -- Khóa mọi quà liên quan (theo id) trước, rồi mới khóa các yêu cầu (theo id).
  perform 1 from public.rewards w
   where w.class_id = v_class and w.id in (
     select rr.reward_id from public.reward_requests rr
      where rr.class_id = v_class and rr.student_id = p_student_id and rr.status = 'pending')
   order by w.id for update;
  for r in select rr.id from public.reward_requests rr
            where rr.class_id = v_class and rr.student_id = p_student_id and rr.status = 'pending'
            order by rr.id for update
  loop
    perform private.reject_request_locked(r.id);
    v_rejected := v_rejected + 1;
  end loop;

  delete from public.group_members where class_id = v_class and student_id = p_student_id;
  update public.students set archived_at = now() where id = p_student_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'students.archive', 'student', p_student_id,
          jsonb_build_object('rejected_requests', v_rejected));
end;
$$;

-- 5) Duyệt yêu cầu: từ chối học sinh đã lưu trữ (giữ nguyên phần còn lại của 20261101000013).
create or replace function public.approve_reward_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid;
  v_reward uuid;
  v_status public.reward_request_status;
  v_archived timestamptz;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select rr.student_id, rr.reward_id into v_student, v_reward from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class;
  if not found then raise exception 'not_allowed'; end if;

  select s.archived_at into v_archived from public.students s
   where s.id = v_student and s.class_id = v_class for no key update;
  if v_archived is not null then raise exception 'student_not_found'; end if;
  perform 1 from public.rewards r where r.id = v_reward and r.class_id = v_class for update;
  select rr.status into v_status from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class for update;
  if v_status <> 'pending' then raise exception 'already_processed'; end if;

  perform private.approve_request_locked(p_request_id, (select auth.uid()));

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.approve', 'reward_request', p_request_id,
          jsonb_build_object('reward_id', v_reward, 'student_id', v_student));
end;
$$;

-- 6) Nhật ký quà (thêm / sửa). Chỉ thay đổi mỗi cột stock (duyệt yêu cầu, set_reward_stock) không ghi ở đây.
create function private.audit_reward() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
    values (new.class_id, (select auth.uid()), 'reward_created', 'reward', new.id,
            jsonb_build_object('name', new.name, 'cost', new.cost, 'description', new.description,
                               'icon', new.icon, 'image_path', new.image_path, 'stock', new.stock, 'hidden', new.hidden));
    return new;
  end if;

  select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb) into v_payload
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
   where n.value is distinct from o.value and n.key not in ('created_at', 'is_demo');
  if v_payload = '{}'::jsonb or v_payload = jsonb_build_object('stock', new.stock) then
    return new;
  end if;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (new.class_id, (select auth.uid()), 'reward_updated', 'reward', new.id, v_payload);
  return new;
end;
$$;
revoke execute on function private.audit_reward() from public, anon, authenticated;

create trigger rewards_audit
  after insert or update on public.rewards
  for each row execute function private.audit_reward();

-- 7) Học sinh của lớp đã lưu trữ mất danh tính (cùng cách với học sinh đã lưu trữ ở 20261101000017).
create or replace function private.my_student_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.student_id
    from public.profiles p
    join public.students s on s.id = p.student_id
    join public.classes c on c.id = p.class_id
   where p.id = (select auth.uid()) and s.archived_at is null and c.archived_at is null
$$;

create or replace function private.my_class_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.class_id
    from public.profiles p
    join public.classes c on c.id = p.class_id
    left join public.students s on s.id = p.student_id
   where p.id = (select auth.uid())
     and (p.student_id is null or (s.archived_at is null and c.archived_at is null))
$$;

-- 8) Điểm danh chỉ ghi qua save_attendance.
drop policy teacher_insert on public.attendance;
drop policy teacher_update on public.attendance;

create or replace function public.save_attendance(p_date date, p_rows jsonb) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_start date;
  v_n int;
  v_del int;
  v_up int;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  if p_date is null then raise exception 'invalid_rows'; end if;
  if p_date > v_today then raise exception 'future_date'; end if;
  select c.term1_start into v_start from public.classes c where c.id = v_class;
  if v_start is not null and p_date < v_start then raise exception 'before_school_year'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'invalid_rows'; end if;
  v_n := jsonb_array_length(p_rows);
  if v_n > 100 then raise exception 'invalid_rows'; end if;
  if v_n = 0 then return 0; end if;

  -- Mỗi dòng phải là object có đủ khóa student_id và status (status có thể null); thiếu khóa không được ngầm xóa.
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
     where jsonb_typeof(e) <> 'object' or not (e ? 'student_id') or not (e ? 'status')
  ) then raise exception 'invalid_rows'; end if;

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

-- 9) Hồ sơ học sinh: số liệu null khi cờ student_can_view_profile tắt; lời chào và sao khả dụng vẫn trả.
create or replace function public.my_profile_summary()
returns table (student_id uuid, full_name text, avatar_id uuid, competition_stars int, available_stars int,
               rank_year int, class_size int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.avatar_id,
         case when private.setting_on('student_can_view_profile') then
           coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::int
         end,
         coalesce(sum(t.delta), 0)::int,
         case when private.setting_on('student_can_view_profile') and private.setting_on('student_can_view_rank') then
           (select x.rank from private.leaderboard_core(null, null) x where x.student_id = s.id)
         end,
         case when private.setting_on('student_can_view_profile') then
           (select count(*)::int from public.students c where c.class_id = s.class_id and c.archived_at is null)
         end
    from public.students s
    left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
   where s.id = private.my_student_id() and s.class_id = private.my_class_id()
   group by s.id, s.class_id, s.full_name, s.avatar_id
$$;

-- 10) Lưu thông tin lớp. Chỉ cập nhật các khóa được gửi.
create function public.save_class_info(p jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  c public.classes;
  k text;
  v jsonb;
  v_text text;
  t1s date;
  t1e date;
  t2s date;
  t2e date;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if p is null or jsonb_typeof(p) <> 'object' or p = '{}'::jsonb then raise exception 'invalid_input'; end if;

  for k, v in select e.key, e.value from jsonb_each(p) e loop
    if k in ('school_name', 'class_name', 'school_year', 'teacher_name', 'slogan') then
      if jsonb_typeof(v) <> 'string' then raise exception 'invalid_input'; end if;
      v_text := btrim(v #>> '{}');
      if char_length(v_text) > 120 or (k <> 'slogan' and char_length(v_text) < 1) then
        raise exception 'invalid_input';
      end if;
    elsif k = 'theme' then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('indigo', 'pink', 'mint', 'gold') then
        raise exception 'invalid_input';
      end if;
    elsif k in ('term1_start', 'term1_end', 'term2_start', 'term2_end') then
      if jsonb_typeof(v) = 'string' then
        begin
          perform (v #>> '{}')::date;
        exception when others then
          raise exception 'invalid_input';
        end;
      elsif jsonb_typeof(v) <> 'null' then
        raise exception 'invalid_input';
      end if;
    else
      raise exception 'invalid_input';
    end if;
  end loop;

  select * into c from public.classes where id = v_class for update;
  t1s := case when p ? 'term1_start' then (p ->> 'term1_start')::date else c.term1_start end;
  t1e := case when p ? 'term1_end' then (p ->> 'term1_end')::date else c.term1_end end;
  t2s := case when p ? 'term2_start' then (p ->> 'term2_start')::date else c.term2_start end;
  t2e := case when p ? 'term2_end' then (p ->> 'term2_end')::date else c.term2_end end;
  if (t1s is not null and not isfinite(t1s)) or (t1e is not null and not isfinite(t1e))
     or (t2s is not null and not isfinite(t2s)) or (t2e is not null and not isfinite(t2e)) then
    raise exception 'invalid_term_dates';
  end if;
  -- Mỗi ngày có giá trị phải đứng trước mọi ngày sau nó: t1s <= t1e < t2s <= t2e (so từng cặp).
  if (t1s > t1e) or (t1s >= t2s) or (t1s >= t2e)
     or (t1e >= t2s) or (t1e >= t2e)
     or (t2s > t2e) then
    raise exception 'invalid_term_dates';
  end if;

  update public.classes set
    school_name = case when p ? 'school_name' then btrim(p ->> 'school_name') else school_name end,
    class_name = case when p ? 'class_name' then btrim(p ->> 'class_name') else class_name end,
    school_year = case when p ? 'school_year' then btrim(p ->> 'school_year') else school_year end,
    teacher_name = case when p ? 'teacher_name' then btrim(p ->> 'teacher_name') else teacher_name end,
    slogan = case when p ? 'slogan' then btrim(p ->> 'slogan') else slogan end,
    theme = case when p ? 'theme' then p ->> 'theme' else theme end,
    term1_start = t1s, term1_end = t1e, term2_start = t2s, term2_end = t2e
   where id = v_class;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'class.info', 'class', v_class, p);
end;
$$;

-- 11) Lưu cài đặt lớp. Chỉ cập nhật các khóa được gửi; timetable_saturday phải đi qua set_timetable_saturday.
create function public.save_class_settings(p jsonb) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  k text;
  v jsonb;
  v_sets text[] := '{}';
  v_steps int[];
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if p is null or jsonb_typeof(p) <> 'object' or p = '{}'::jsonb then raise exception 'invalid_input'; end if;

  for k, v in select e.key, e.value from jsonb_each(p) e loop
    if k = 'timetable_saturday' then
      raise exception 'use_set_saturday';
    elsif k in ('require_approval', 'reserve_on_request', 'only_enough', 'feature_missions', 'feature_random',
                'feature_display', 'feature_rewards', 'student_can_view_profile', 'student_can_view_history',
                'student_can_view_rank', 'student_can_view_rewards', 'student_can_view_timetable',
                'student_can_view_news', 'student_can_view_attendance', 'student_can_change_avatar') then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'invalid_input'; end if;
      v_sets := v_sets || format('%I = %L::boolean', k, v #>> '{}');
    elsif k = 'weekly_redeem_limit' then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}') !~ '^[0-9]{1,3}$'
         or (v #>> '{}')::int not between 1 and 20 then
        raise exception 'invalid_redeem_limit';
      end if;
      v_sets := v_sets || format('weekly_redeem_limit = %L::int', v #>> '{}');
    elsif k = 'star_steps' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) not between 1 and 8
         or exists (select 1 from jsonb_array_elements(v) e
                     where jsonb_typeof(e) <> 'number' or (e #>> '{}') !~ '^[0-9]{1,3}$') then
        raise exception 'invalid_star_steps';
      end if;
      select array_agg((e.value #>> '{}')::int order by e.ord) into v_steps
        from jsonb_array_elements(v) with ordinality e(value, ord);
      if not private.valid_star_steps(v_steps) then raise exception 'invalid_star_steps'; end if;
      v_sets := v_sets || format('star_steps = %L::int[]', v_steps);
    else
      raise exception 'invalid_input';
    end if;
  end loop;

  perform 1 from public.class_settings cs where cs.class_id = v_class for update;
  execute format('update public.class_settings set %s where class_id = %L', array_to_string(v_sets, ', '), v_class);

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'class.settings', 'class_settings', v_class, p);
end;
$$;

-- 12) Bật/tắt học thứ Bảy. Tắt khi còn tiết thứ Bảy: p_clear=false báo lỗi, p_clear=true xóa tiết trong cùng giao dịch.
create function public.set_timetable_saturday(p_on boolean, p_clear boolean) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_deleted int := 0;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if p_on is null then raise exception 'invalid_input'; end if;

  perform 1 from public.class_settings cs where cs.class_id = v_class for update;

  if not p_on then
    if exists (select 1 from public.timetable_slots ts where ts.class_id = v_class and ts.weekday = 6) then
      if not coalesce(p_clear, false) then raise exception 'saturday_has_slots'; end if;
      delete from public.timetable_slots ts where ts.class_id = v_class and ts.weekday = 6;
      get diagnostics v_deleted = row_count;
    end if;
  end if;

  update public.class_settings set timetable_saturday = p_on where class_id = v_class;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'class.saturday', 'class_settings', v_class,
          jsonb_build_object('on', p_on, 'deleted_slots', v_deleted));
  return v_deleted;
end;
$$;

-- 13) Hoàn tác một lượt hoàn thành nhiệm vụ: xóa dòng hoàn thành; có sao thì đảo lô sao bằng reverse_batch (20261101000017).
create function public.undo_mission_completion(p_completion_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_c public.mission_completions;
  v_batch uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select * into v_c from public.mission_completions c where c.id = p_completion_id and c.class_id = v_class;
  if not found then raise exception 'completion_not_found'; end if;

  -- reverse_batch khóa học sinh (FOR NO KEY UPDATE) rồi đảo lô và xóa dòng hoàn thành gắn với lô đó.
  if v_c.star_transaction_id is not null then
    select t.batch_id into v_batch from public.star_transactions t
     where t.class_id = v_class and t.id = v_c.star_transaction_id;
    perform public.reverse_batch(v_batch);
  end if;
  delete from public.mission_completions c where c.id = p_completion_id and c.class_id = v_class;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'missions.undo', 'mission', v_c.mission_id,
          jsonb_build_object('completion_id', p_completion_id, 'student_id', v_c.student_id,
                             'period_key', v_c.period_key, 'had_stars', v_c.star_transaction_id is not null));
end;
$$;

revoke execute on function
  public.save_class_info(jsonb), public.save_class_settings(jsonb),
  public.set_timetable_saturday(boolean, boolean), public.undo_mission_completion(uuid)
  from public, anon;
grant execute on function
  public.save_class_info(jsonb), public.save_class_settings(jsonb),
  public.set_timetable_saturday(boolean, boolean), public.undo_mission_completion(uuid)
  to authenticated;

-- 14) Quyền cột: giáo viên không sửa trực tiếp các cột chỉ đi qua hàm (owner_id, archived_at của lớp,
--     timetable_saturday, stock của quà). Các cột còn lại vẫn sửa được qua RLS như cũ.
do $$
declare
  r record;
begin
  for r in select * from (values
    ('classes', array['id', 'owner_id', 'archived_at', 'created_at']),
    ('class_settings', array['class_id', 'timetable_saturday', 'created_at', 'is_demo']),
    ('rewards', array['id', 'class_id', 'stock', 'created_at', 'is_demo'])) v(tbl, excluded)
  loop
    execute format('revoke update on public.%I from authenticated', r.tbl);
    execute format('grant update (%s) on public.%I to authenticated',
      (select string_agg(quote_ident(a.attname), ', ' order by a.attnum)
         from pg_attribute a
        where a.attrelid = format('public.%I', r.tbl)::regclass and a.attnum > 0 and not a.attisdropped
          and a.attname <> all (r.excluded)),
      r.tbl);
  end loop;
end $$;
