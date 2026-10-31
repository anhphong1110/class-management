-- Kho ảnh lớp (bucket private) và hàm đổi avatar.
-- Đường dẫn đối tượng: <class_id>/<folder>/<uuid>.<ext>, folder: logo|cover|rewards|avatars|announcements.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('class-media', 'class-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy class_media_select on storage.objects for select to authenticated
  using (bucket_id = 'class-media'
         and (storage.foldername(name))[1] = (select private.my_class_id())::text);

create policy class_media_teacher_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'class-media' and private.is_teacher()
              and (storage.foldername(name))[1] = (select private.my_class_id())::text);

create policy class_media_teacher_update on storage.objects for update to authenticated
  using (bucket_id = 'class-media' and private.is_teacher()
         and (storage.foldername(name))[1] = (select private.my_class_id())::text)
  with check (bucket_id = 'class-media' and private.is_teacher()
              and (storage.foldername(name))[1] = (select private.my_class_id())::text);

create policy class_media_teacher_delete on storage.objects for delete to authenticated
  using (bucket_id = 'class-media' and private.is_teacher()
         and (storage.foldername(name))[1] = (select private.my_class_id())::text);

-- Học sinh tự đổi avatar của mình
create function public.set_my_avatar(p_avatar_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
  v_student uuid := private.my_student_id();
begin
  if v_student is null or not private.setting_on('student_can_change_avatar') then
    raise exception 'avatar_not_allowed';
  end if;
  if not exists (
    select 1 from public.avatar_library a
     where a.id = p_avatar_id and a.class_id = v_class and not a.hidden
  ) then
    raise exception 'avatar_not_found';
  end if;
  update public.students set avatar_id = p_avatar_id
   where id = v_student and class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'avatar.set', 'student', v_student,
          jsonb_build_object('avatar_id', p_avatar_id));
end;
$$;

-- Giáo viên đổi avatar cho một tài khoản trong lớp
create function public.set_avatar_for(p_profile_id uuid, p_avatar_id uuid) returns void
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
  if not exists (
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
  values (v_class, (select auth.uid()), 'avatar.set', 'profile', p_profile_id,
          jsonb_build_object('avatar_id', p_avatar_id));
end;
$$;

revoke execute on function public.set_my_avatar(uuid), public.set_avatar_for(uuid, uuid) from public, anon;
grant execute on function public.set_my_avatar(uuid), public.set_avatar_for(uuid, uuid) to authenticated;
