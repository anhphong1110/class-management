-- Phản hồi của khách sau khi review: xóa học sinh, xóa quà, gỡ avatar / xóa ảnh avatar tải lên, tên trạm tùy chỉnh.

-- 1) Sổ sao: ngoài nhánh xóa dữ liệu demo, cho phép xóa dòng của đúng một học sinh khi delete_student đặt cờ
--    app.student_purge = id học sinh đó. Điều kiện vai gọi như nhánh demo (hàm definer chạy bằng vai chủ sở hữu,
--    người dùng API không đặt được GUC rồi tự xóa). UPDATE luôn bị chặn.
create or replace function private.star_ledger_immutable() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_user not in ('authenticated', 'anon', 'service_role') then
    if coalesce(current_setting('app.demo_purge', true), '') = 'on'
       and exists (select 1 from public.students s where s.id = old.student_id and s.is_demo) then
      return old;
    end if;
    if coalesce(current_setting('app.student_purge', true), '') = old.student_id::text then
      return old;
    end if;
  end if;
  raise exception 'ledger_immutable';
end;
$$;

-- 2) Xóa hẳn một học sinh (kể cả đã lưu trữ) cùng mọi dữ liệu của em. Trả mảng id tài khoản Auth cần xóa
--    (rỗng nếu em chưa có tài khoản); Server Action xóa tiếp các tài khoản đó bằng client admin.
--    Khóa: học sinh (FOR NO KEY UPDATE) -> quà liên quan -> yêu cầu của em (cùng thứ tự archive_student).
create function public.delete_student(p_student_id uuid) returns uuid[]
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
  delete from public.attendance where class_id = v_class and student_id = p_student_id;
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

-- 3) Xóa hẳn một phần thưởng chưa từng có yêu cầu đổi (kể cả đã bị từ chối). Trả image_path để Server Action
--    xóa ảnh trong storage. Quà đã có lịch sử thì chặn: dùng "Ẩn" để giữ lịch sử.
create function public.delete_reward(p_reward_id uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  w public.rewards;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  select * into w from public.rewards where id = p_reward_id and class_id = v_class for update;
  if not found then raise exception 'reward_not_found'; end if;
  if exists (select 1 from public.reward_requests rr where rr.class_id = v_class and rr.reward_id = p_reward_id) then
    raise exception 'reward_has_requests';
  end if;

  delete from public.rewards where id = p_reward_id and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'reward_deleted', 'reward', p_reward_id,
          jsonb_build_object('name', w.name, 'cost', w.cost));
  return w.image_path;
end;
$$;

-- 4) Gỡ avatar: p_avatar_id = null đưa người đó về avatar mặc định.
create or replace function public.set_avatar_for(p_profile_id uuid, p_avatar_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
  v_target public.profiles;
begin
  if not private.is_teacher() then
    raise exception 'not_allowed';
  end if;
  select * into v_target from public.profiles where id = p_profile_id and class_id = v_class;
  if not found then
    raise exception 'not_allowed';
  end if;
  if p_avatar_id is not null and not exists (
    select 1 from public.avatar_library a
     where a.id = p_avatar_id and a.class_id = v_class and not a.hidden
  ) then
    raise exception 'avatar_not_found';
  end if;
  if v_target.student_id is not null then
    update public.students set avatar_id = p_avatar_id
     where id = v_target.student_id and class_id = v_class;
  else
    update public.profiles set avatar_id = p_avatar_id where id = p_profile_id;
  end if;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), case when p_avatar_id is null then 'avatar.clear' else 'avatar.set' end,
          'profile', p_profile_id, jsonb_build_object('avatar_id', p_avatar_id));
end;
$$;

create or replace function public.set_student_avatar(p_student_id uuid, p_avatar_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
begin
  if not private.is_teacher() then
    raise exception 'not_allowed';
  end if;
  if not exists (
    select 1 from public.students s where s.id = p_student_id and s.class_id = v_class
  ) then
    raise exception 'not_allowed';
  end if;
  if p_avatar_id is not null and not exists (
    select 1 from public.avatar_library a
     where a.id = p_avatar_id and a.class_id = v_class and not a.hidden
  ) then
    raise exception 'avatar_not_found';
  end if;
  update public.students set avatar_id = p_avatar_id
   where id = p_student_id and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), case when p_avatar_id is null then 'avatar.clear' else 'avatar.set' end,
          'student', p_student_id, jsonb_build_object('avatar_id', p_avatar_id));
end;
$$;

-- 5) Xóa một ảnh avatar tải lên khỏi thư viện (chỉ kind = 'upload'). Khóa ngoại SET NULL tự đưa người đang dùng
--    về avatar mặc định. Trả image_path để Server Action xóa file trong storage.
create function public.delete_avatar_upload(p_id uuid) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  a public.avatar_library;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  select * into a from public.avatar_library where id = p_id and class_id = v_class and kind = 'upload' for update;
  if not found then raise exception 'avatar_not_found'; end if;

  delete from public.avatar_library where id = p_id and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'avatar.deleted', 'avatar', p_id, jsonb_build_object('label', a.label));
  return a.image_path;
end;
$$;

-- 6) Tên trạm tùy chỉnh. Để trống thì giao diện tự suy ra từ tên lớp ("Năm 8 (5/8)" -> "Trạm không gian Năm 8").
alter table public.classes
  add column brand_title text check (brand_title is null or char_length(btrim(brand_title)) between 1 and 60);

revoke execute on function public.delete_student(uuid), public.delete_reward(uuid), public.delete_avatar_upload(uuid)
  from public, anon;
grant execute on function public.delete_student(uuid), public.delete_reward(uuid), public.delete_avatar_upload(uuid)
  to authenticated;

-- 7) save_class_info nhận thêm khóa brand_title (phần còn lại giữ nguyên như 20261101000018).
create or replace function public.save_class_info(p jsonb) returns void
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
    elsif k = 'brand_title' then
      -- Tên trạm: chuỗi tối đa 60 ký tự; chuỗi rỗng hoặc null = bỏ (dùng tên suy ra từ tên lớp).
      if jsonb_typeof(v) = 'string' then
        if char_length(btrim(v #>> '{}')) > 60 then raise exception 'invalid_input'; end if;
      elsif jsonb_typeof(v) <> 'null' then
        raise exception 'invalid_input';
      end if;
    elsif k = 'theme' then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('indigo', 'pink', 'mint', 'gold') then
        raise exception 'invalid_input';
      end if;
    elsif k in ('logo_path', 'class_logo_path', 'cover_path') then
      -- Ảnh thương hiệu phải nằm trong <class_id>/branding/ của chính lớp này; null để bỏ ảnh.
      if jsonb_typeof(v) = 'string' then
        if (v #>> '{}') !~ ('^' || v_class::text || '/branding/[A-Za-z0-9_-][A-Za-z0-9._-]*$') or (v #>> '{}') like '%..%' then
          raise exception 'invalid_input';
        end if;
      elsif jsonb_typeof(v) <> 'null' then
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
    brand_title = case when p ? 'brand_title' then nullif(btrim(p ->> 'brand_title'), '') else brand_title end,
    logo_path = case when p ? 'logo_path' then p ->> 'logo_path' else logo_path end,
    class_logo_path = case when p ? 'class_logo_path' then p ->> 'class_logo_path' else class_logo_path end,
    cover_path = case when p ? 'cover_path' then p ->> 'cover_path' else cover_path end,
    term1_start = t1s, term1_end = t1e, term2_start = t2s, term2_end = t2e
   where id = v_class;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'class.info', 'class', v_class, p);
end;
$$;
