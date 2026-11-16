-- Gỡ chức năng Điểm danh: xóa bảng, hàm, kiểu và cột cờ cho học sinh xem, rồi viết lại các hàm từng nhắc tới chúng.
-- Dữ liệu điểm danh cũ bị xóa vĩnh viễn. Các dòng audit_logs có action 'attendance.save' được giữ lại làm lịch sử.
-- Bản sao lưu cũ vẫn khôi phục được: khóa 'attendance' trong tables và cột student_can_view_attendance bị bỏ qua.
-- Mỗi hàm dưới đây là bản sao nguyên văn của định nghĩa mới nhất, chỉ bỏ phần điểm danh.

-- 1) Báo cáo: bỏ chuyên cần khỏi report_summary.
create or replace function public.report_summary(p_from date, p_to date, p_bucket text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_days int;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_prev_ts timestamptz;
  v_last int;
  v_result jsonb;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if p_from is null or p_to is null or p_bucket is null or p_bucket not in ('day', 'week', 'month')
     or p_from > p_to or p_to - p_from + 1 > 400 then
    raise exception 'invalid_range';
  end if;

  v_days := p_to - p_from + 1;
  v_from_ts := p_from::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_to_ts := (p_to + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_prev_ts := (p_from - v_days)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_last := case p_bucket
    when 'day' then p_to - p_from
    when 'week' then (p_to - p_from) / 7
    else (extract(year from p_to)::int * 12 + extract(month from p_to)::int)
       - (extract(year from p_from)::int * 12 + extract(month from p_from)::int)
  end;

  with st as (
    select s.id, s.full_name, s.avatar_id, s.roll_no
      from public.students s where s.class_id = v_class and s.archived_at is null
  ),
  tx as (
    select t.student_id, t.kind, t.delta, t.criterion_id,
           case p_bucket
             when 'day' then (t.created_at at time zone 'Asia/Ho_Chi_Minh')::date - p_from
             when 'week' then ((t.created_at at time zone 'Asia/Ho_Chi_Minh')::date - p_from) / 7
             else (extract(year from t.created_at at time zone 'Asia/Ho_Chi_Minh')::int * 12
                   + extract(month from t.created_at at time zone 'Asia/Ho_Chi_Minh')::int)
                - (extract(year from p_from)::int * 12 + extract(month from p_from)::int)
           end as bi
      from public.star_transactions t
      join st on st.id = t.student_id
     where t.class_id = v_class and t.kind in ('award', 'penalty')
       and t.created_at >= v_from_ts and t.created_at < v_to_ts
       and not exists (select 1 from public.star_transactions r where r.class_id = t.class_id and r.reverses_id = t.id)
  ),
  series as (
    select i,
           case p_bucket
             -- Khoảng quá 7 ngày (chọn ngày) lặp lại thứ, nên thêm dd/mm cho khỏi nhầm.
             when 'day' then (array['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'])[extract(isodow from p_from + i)::int]
                             || case when v_days > 7 then ' ' || to_char(p_from + i, 'DD/MM') else '' end
             when 'week' then 'Tuần ' || (i + 1)
             else 'T' || extract(month from date_trunc('month', p_from) + make_interval(months => i))::int
           end as label
      from generate_series(0, v_last) i
  ),
  per as (
    select st.id, st.full_name, st.avatar_id, st.roll_no,
           coalesce(sum(t.delta) filter (where t.created_at >= v_from_ts), 0)::int as cur,
           coalesce(sum(t.delta) filter (where t.created_at < v_from_ts), 0)::int as prev
      from st
      left join public.star_transactions t
        on t.class_id = v_class and t.student_id = st.id and t.kind in ('award', 'penalty', 'reversal')
       and t.created_at >= v_prev_ts and t.created_at < v_to_ts
     group by st.id, st.full_name, st.avatar_id, st.roll_no
  ),
  gift as (
    select r.name as label, count(*)::int as n
      from public.reward_requests rq
      join public.rewards r on r.class_id = rq.class_id and r.id = rq.reward_id
      join st on st.id = rq.student_id
     where rq.class_id = v_class and rq.status in ('approved', 'delivered')
       and rq.decided_at >= v_from_ts and rq.decided_at < v_to_ts
     group by r.id, r.name
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'added', (select coalesce(sum(delta) filter (where kind = 'award'), 0)::int from tx),
      'deducted', (select coalesce(-sum(delta) filter (where kind = 'penalty'), 0)::int from tx),
      'redeemed', (select coalesce(sum(n), 0)::int from gift),
      'improved', (select count(*)::int from per where cur > prev)),
    'buckets', (select jsonb_agg(jsonb_build_object(
        'label', sr.label,
        'added', coalesce((select sum(x.delta) from tx x where x.bi = sr.i and x.kind = 'award'), 0)::int,
        'deducted', coalesce((select -sum(x.delta) from tx x where x.bi = sr.i and x.kind = 'penalty'), 0)::int)
        order by sr.i) from series sr),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('label', q.label, 'kind', q.kind, 'n', q.n)
        order by q.n desc, q.label)
        from (select c.label, c.kind::text as kind, count(*)::int as n
                from tx join public.star_criteria c on c.class_id = v_class and c.id = tx.criterion_id
               group by c.id, c.label, c.kind) q), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(jsonb_build_object('studentId', q.id, 'name', q.full_name,
        'avatarId', q.avatar_id, 'up', q.up) order by q.up desc, q.roll_no)
        from (select id, full_name, avatar_id, roll_no, cur - prev as up from per
               where cur > prev order by cur - prev desc, roll_no limit 5) q), '[]'::jsonb),
    'gifts', coalesce((select jsonb_agg(jsonb_build_object('label', g.label, 'n', g.n) order by g.n desc, g.label)
        from gift g), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- 2) Cài đặt lớp: bỏ cờ student_can_view_attendance khỏi danh sách được phép sửa.
create or replace function public.save_class_settings(p jsonb) returns void
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
                'student_can_view_news', 'student_can_change_avatar') then
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

-- 3) Sao lưu: bỏ bảng attendance khỏi danh sách bảng và bản đồ khóa ngoại.
create or replace function private.backup_tables() returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['avatar_library', 'students', 'groups', 'group_members', 'star_criteria', 'rewards',
               'reward_requests', 'star_transactions', 'subjects', 'timetable_slots',
               'announcements', 'missions', 'mission_completions', 'badges', 'student_badges', 'class_settings']
$$;

create or replace function private.backup_remap_row(p_table text, p_row jsonb, p_old uuid, p_new uuid, p_user uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb := p_row || jsonb_build_object('class_id', p_new);
  c text;
  refs text[] := case p_table
    when 'students' then array['avatar_id']
    when 'group_members' then array['group_id', 'student_id']
    when 'reward_requests' then array['student_id', 'reward_id']
    when 'star_transactions' then array['student_id', 'criterion_id', 'reward_request_id', 'reverses_id', 'batch_id']
    when 'timetable_slots' then array['subject_id']
    when 'mission_completions' then array['mission_id', 'student_id', 'star_transaction_id']
    when 'student_badges' then array['badge_id', 'student_id']
    else array[]::text[] end;
  actors text[] := case p_table
    when 'reward_requests' then array['decided_by']
    when 'star_transactions' then array['actor_id']
    when 'student_badges' then array['awarded_by']
    else array[]::text[] end;
  paths text[] := case p_table
    when 'avatar_library' then array['image_path']
    when 'rewards' then array['image_path']
    when 'announcements' then array['image_path']
    else array[]::text[] end;
begin
  if p_table <> 'class_settings' then
    v := v || jsonb_build_object('id', private.backup_new_id(p_new, p_row ->> 'id'));
  end if;
  foreach c in array refs loop
    if jsonb_typeof(v -> c) = 'string' then
      v := v || jsonb_build_object(c, private.backup_new_id(p_new, v ->> c));
    end if;
  end loop;
  foreach c in array actors loop
    -- Chỉ giữ người dùng là chính giáo viên đang khôi phục; mọi người khác (kể cả còn tồn tại) đặt null.
    if not (jsonb_typeof(v -> c) = 'string' and lower(v ->> c) = p_user::text) then
      v := v || jsonb_build_object(c, null::text);
    end if;
  end loop;
  foreach c in array paths loop
    v := v || jsonb_build_object(c, private.backup_remap_path(v -> c, p_old, p_new));
  end loop;
  return v;
end;
$$;

-- 4) Xóa dữ liệu demo và xóa học sinh: không còn dọn bảng attendance.
create or replace function public.delete_demo_data() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_students uuid[];
  v_auth uuid[];
  v_deleted int;
  v_kept int;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  select coalesce(array_agg(l.id order by l.id), array[]::uuid[]) into v_students
    from (select s.id from public.students s where s.class_id = v_class and s.is_demo order by s.id for no key update) l;
  perform 1 from (select w.id from public.rewards w where w.class_id = v_class and w.is_demo order by w.id for update) l;
  perform 1 from (select rr.id from public.reward_requests rr
                   where rr.class_id = v_class and (rr.student_id = any (v_students) or rr.is_demo)
                   order by rr.id for update) l;

  perform set_config('app.demo_purge', 'on', true);

  -- 1) Dữ liệu gắn với học sinh.
  delete from public.mission_completions where class_id = v_class and (student_id = any (v_students) or is_demo);
  delete from public.student_badges where class_id = v_class and (student_id = any (v_students) or is_demo);
  delete from public.star_transactions where class_id = v_class and student_id = any (v_students);
  delete from public.reward_requests rr
   where rr.class_id = v_class
     and (rr.student_id = any (v_students)
          or (rr.is_demo and not exists (select 1 from public.star_transactions t
                                          where t.class_id = rr.class_id and t.reward_request_id = rr.id)));
  delete from public.group_members where class_id = v_class and (student_id = any (v_students) or is_demo);

  perform set_config('app.demo_purge', 'off', true);

  -- 2) Hồ sơ đăng nhập rồi học sinh.
  with d as (delete from public.profiles where class_id = v_class and role = 'student' and student_id = any (v_students) returning id)
  select coalesce(array_agg(d.id order by d.id), array[]::uuid[]) into v_auth from d;
  delete from public.students where class_id = v_class and id = any (v_students);
  get diagnostics v_deleted = row_count;

  -- 3) Danh mục demo không còn ai dùng: thời khóa biểu trước môn học.
  delete from public.timetable_slots where class_id = v_class and is_demo;
  delete from public.subjects x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.timetable_slots t where t.class_id = x.class_id and t.subject_id = x.id);
  delete from public.missions x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.mission_completions c where c.class_id = x.class_id and c.mission_id = x.id);
  delete from public.badges x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.student_badges c where c.class_id = x.class_id and c.badge_id = x.id);
  delete from public.rewards x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.reward_requests c where c.class_id = x.class_id and c.reward_id = x.id);
  delete from public.star_criteria x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.star_transactions c where c.class_id = x.class_id and c.criterion_id = x.id);
  delete from public.announcements where class_id = v_class and is_demo;
  delete from public.groups x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.group_members c where c.class_id = x.class_id and c.group_id = x.id);
  delete from public.avatar_library x where x.class_id = v_class and x.is_demo
     and not exists (select 1 from public.students c where c.class_id = x.class_id and c.avatar_id = x.id)
     and not exists (select 1 from public.profiles c where c.class_id = x.class_id and c.avatar_id = x.id);

  select (select count(*) from public.subjects where class_id = v_class and is_demo)
       + (select count(*) from public.missions where class_id = v_class and is_demo)
       + (select count(*) from public.badges where class_id = v_class and is_demo)
       + (select count(*) from public.rewards where class_id = v_class and is_demo)
       + (select count(*) from public.star_criteria where class_id = v_class and is_demo)
       + (select count(*) from public.groups where class_id = v_class and is_demo)
       + (select count(*) from public.avatar_library where class_id = v_class and is_demo)
    into v_kept;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'demo_data_deleted', 'class', v_class,
          jsonb_build_object('deleted_students', v_deleted, 'kept_catalog', v_kept));

  return jsonb_build_object('deletedStudents', v_deleted, 'keptCatalog', v_kept, 'authUserIds', to_jsonb(v_auth));
end;
$$;

create or replace function public.delete_student(p_student_id uuid) returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_name text;
  v_code text;
  v_auth uuid[];
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  select s.full_name, s.code into v_name, v_code
    from public.students s
   where s.id = p_student_id and s.class_id = v_class for no key update;
  if not found then raise exception 'student_not_found'; end if;

  perform 1 from public.rewards w
   where w.class_id = v_class and w.id in (
     select rr.reward_id from public.reward_requests rr
      where rr.class_id = v_class and rr.student_id = p_student_id)
   order by w.id for update;
  perform 1 from (select rr.id from public.reward_requests rr
                   where rr.class_id = v_class and rr.student_id = p_student_id order by rr.id for update) l;

  perform set_config('app.student_purge', p_student_id::text, true);
  delete from public.mission_completions where class_id = v_class and student_id = p_student_id;
  delete from public.student_badges where class_id = v_class and student_id = p_student_id;
  delete from public.star_transactions where class_id = v_class and student_id = p_student_id;
  delete from public.reward_requests where class_id = v_class and student_id = p_student_id;
  delete from public.group_members where class_id = v_class and student_id = p_student_id;
  perform set_config('app.student_purge', '', true);

  with d as (delete from public.profiles where class_id = v_class and role = 'student' and student_id = p_student_id returning id)
  select coalesce(array_agg(d.id order by d.id), array[]::uuid[]) into v_auth from d;
  delete from public.students where class_id = v_class and id = p_student_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'student_deleted', 'student', p_student_id,
          jsonb_build_object('code', v_code, 'full_name', v_name));
  return v_auth;
end;
$$;

-- 5) Xóa hàm, bảng (kéo theo chỉ mục và policy RLS), kiểu và cột cờ.
drop function public.save_attendance(date, jsonb);
drop table public.attendance;
drop type public.attendance_status;
alter table public.class_settings drop column student_can_view_attendance;
