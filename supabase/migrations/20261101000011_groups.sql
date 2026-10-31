-- Quản lý tổ: đặt vai, chuyển tổ, thêm/xóa tổ. Chỉ giáo viên của lớp.

create function public.set_group_role(p_student_id uuid, p_role public.group_role) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_group uuid;
  v_old public.group_role;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  -- Khóa tổ trước để hai thao tác cùng tổ chạy tuần tự.
  select gm.group_id into v_group from public.group_members gm
   where gm.class_id = v_class and gm.student_id = p_student_id;
  if v_group is null then raise exception 'not_in_group'; end if;
  perform 1 from public.groups g where g.id = v_group and g.class_id = v_class for update;

  select gm.role into v_old from public.group_members gm
   where gm.class_id = v_class and gm.student_id = p_student_id;
  if v_old is null then raise exception 'not_in_group'; end if;
  if v_old = p_role then return; end if;

  -- Chỉ mục duy nhất không hoãn được: hạ người đang giữ vai trước khi nâng người mới.
  if p_role in ('leader', 'deputy') then
    update public.group_members
       set role = 'member'
     where group_id = v_group and class_id = v_class and role = p_role and student_id <> p_student_id;
  end if;
  update public.group_members set role = p_role
   where class_id = v_class and student_id = p_student_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'groups.set_role', 'student', p_student_id,
          jsonb_build_object('group_id', v_group, 'role', p_role, 'previous_role', v_old));
end
$$;

create function public.move_student_to_group(p_student_id uuid, p_group_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_from uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if not exists (select 1 from public.groups g where g.id = p_group_id and g.class_id = v_class) then
    raise exception 'not_allowed';
  end if;
  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class and s.archived_at is null for update;
  if not found then raise exception 'student_not_found'; end if;

  select gm.group_id into v_from from public.group_members gm
   where gm.class_id = v_class and gm.student_id = p_student_id;
  if v_from is not distinct from p_group_id then return; end if;

  insert into public.group_members (class_id, group_id, student_id, role)
  values (v_class, p_group_id, p_student_id, 'member')
  on conflict (class_id, student_id) do update set group_id = excluded.group_id, role = 'member';

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'groups.move_student', 'student', p_student_id,
          jsonb_build_object('from_group_id', v_from, 'to_group_id', p_group_id));
end
$$;

create function public.create_group(p_name text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_name = '' or char_length(v_name) > 200 then raise exception 'name_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('groups:' || v_class::text, 0));
  insert into public.groups (class_id, name, sort_order)
  values (v_class, v_name, coalesce((select max(g.sort_order) from public.groups g where g.class_id = v_class), 0) + 1)
  returning id into v_id;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'groups.create', 'group', v_id, jsonb_build_object('name', v_name));
  return v_id;
end
$$;

create function public.delete_group(p_group_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_name text;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  select g.name into v_name from public.groups g where g.id = p_group_id and g.class_id = v_class for update;
  if not found then raise exception 'not_allowed'; end if;
  if exists (select 1 from public.group_members gm where gm.group_id = p_group_id) then
    raise exception 'group_not_empty';
  end if;
  delete from public.groups where id = p_group_id and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'groups.delete', 'group', p_group_id, jsonb_build_object('name', v_name));
end
$$;

revoke execute on function public.set_group_role(uuid, public.group_role) from public, anon;
revoke execute on function public.move_student_to_group(uuid, uuid) from public, anon;
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.delete_group(uuid) from public, anon;
grant execute on function public.set_group_role(uuid, public.group_role) to authenticated;
grant execute on function public.move_student_to_group(uuid, uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
