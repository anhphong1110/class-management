-- Giáo viên đổi avatar cho một học sinh theo students.id (kể cả học sinh chưa có tài khoản).
create function public.set_student_avatar(p_student_id uuid, p_avatar_id uuid) returns void
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
  if not exists (
    select 1 from public.avatar_library a
     where a.id = p_avatar_id and a.class_id = v_class and not a.hidden
  ) then
    raise exception 'avatar_not_found';
  end if;
  update public.students set avatar_id = p_avatar_id
   where id = p_student_id and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'avatar.set', 'student', p_student_id,
          jsonb_build_object('avatar_id', p_avatar_id));
end;
$$;

revoke execute on function public.set_student_avatar(uuid, uuid) from public, anon;
grant execute on function public.set_student_avatar(uuid, uuid) to authenticated;
