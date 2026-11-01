-- Đợt 6, Task 6: sao lưu (xuất JSON) và khôi phục sang lớp mới, cùng helper đóng lớp dùng chung với Task 7.
-- Thứ tự khóa (xem 20261101000008): students (FOR NO KEY UPDATE) -> rewards -> reward_requests.
-- Mọi hàm: security definer, search_path rỗng, chỉ cấp EXECUTE cho authenticated (không cấp cho PUBLIC/anon).

-- 1) Danh sách bảng có class_id (trừ profiles và audit_logs) theo THỨ TỰ CHÈN hợp lệ theo khóa ngoại.
--    Sổ sao chèn sau students, star_criteria, reward_requests; mission_completions sau star_transactions.
create function private.backup_tables() returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['avatar_library', 'students', 'groups', 'group_members', 'star_criteria', 'rewards',
               'reward_requests', 'star_transactions', 'attendance', 'subjects', 'timetable_slots',
               'announcements', 'missions', 'mission_completions', 'badges', 'student_badges', 'class_settings']
$$;
revoke execute on function private.backup_tables() from public, anon, authenticated;

-- 2) Id mới của một dòng khi khôi phục: suy ra từ (lớp mới, id cũ) nên mọi khóa ngoại cùng id cũ
--    luôn trỏ về cùng một dòng mới, không cần bảng ánh xạ.
create function private.backup_new_id(p_new_class uuid, p_old text) returns uuid
language sql
immutable
set search_path = ''
as $$ select md5(p_new_class::text || ':' || lower(p_old))::uuid $$;
revoke execute on function private.backup_new_id(uuid, text) from public, anon, authenticated;

-- Đường dẫn ảnh <lớp cũ>/<thư mục>/<tệp> đổi sang <lớp mới>/...; mọi đường dẫn khác (lớp lạ, "..") thành null.
create function private.backup_remap_path(p_path jsonb, p_old uuid, p_new uuid) returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_path) = 'string'
         and (p_path #>> '{}') ~ ('^' || p_old::text || '/[A-Za-z0-9_-]+/[A-Za-z0-9_-][A-Za-z0-9._-]*$')
         and (p_path #>> '{}') not like '%..%'
    then p_new::text || '/' || substr(p_path #>> '{}', char_length(p_old::text) + 2)
  end
$$;
revoke execute on function private.backup_remap_path(jsonb, uuid, uuid) from public, anon, authenticated;

-- 3) Kiểm hình dạng bản sao lưu (giống validateBackup phía ứng dụng).
create function private.backup_valid(p jsonb) returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  guid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  t text;
  rows jsonb;
  e jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  if (p -> 'format') is distinct from to_jsonb('tram-khong-gian-backup'::text) then return false; end if;
  if (p -> 'version') is distinct from '1'::jsonb then return false; end if;
  if jsonb_typeof(p -> 'class') <> 'object'
     or jsonb_typeof(p #> '{class,id}') is distinct from 'string' or (p #>> '{class,id}') !~ guid
     or jsonb_typeof(p #> '{class,class_name}') is distinct from 'string' or btrim(p #>> '{class,class_name}') = ''
     or jsonb_typeof(p #> '{class,school_year}') is distinct from 'string' then
    return false;
  end if;
  if jsonb_typeof(p -> 'tables') <> 'object' then return false; end if;
  foreach t in array private.backup_tables() loop
    rows := p -> 'tables' -> t;
    if jsonb_typeof(rows) is distinct from 'array' then return false; end if;
    for e in select x from jsonb_array_elements(rows) x loop
      if jsonb_typeof(e) <> 'object' then return false; end if;
      if t <> 'class_settings'
         and (jsonb_typeof(e -> 'id') is distinct from 'string' or (e ->> 'id') !~ guid) then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end;
$$;
revoke execute on function private.backup_valid(jsonb) from public, anon, authenticated;

-- 4) Đổi một dòng của bản sao lưu sang lớp mới: id, class_id, khóa ngoại, đường dẫn ảnh; người dùng không còn thì null.
create function private.backup_remap_row(p_table text, p_row jsonb, p_old uuid, p_new uuid) returns jsonb
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
    when 'attendance' then array['student_id']
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
    if not (jsonb_typeof(v -> c) = 'string'
            and (v ->> c) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            and exists (select 1 from auth.users u where u.id = (v ->> c)::uuid)) then
      v := v || jsonb_build_object(c, null::text);
    end if;
  end loop;
  foreach c in array paths loop
    v := v || jsonb_build_object(c, private.backup_remap_path(v -> c, p_old, p_new));
  end loop;
  return v;
end;
$$;
revoke execute on function private.backup_remap_row(text, jsonb, uuid, uuid) from public, anon, authenticated;

-- 5) Đóng một lớp: khóa học sinh, từ chối mọi yêu cầu pending (trả sao đang giữ), đặt archived_at, ghi nhật ký.
--    Người gọi (hàm public) đã kiểm quyền giáo viên và quyền với lớp này. Trả số yêu cầu đã từ chối.
--    Task 7 (mở năm học mới) dùng lại hàm này.
create function private.close_class(p_class_id uuid) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_rejected int := 0;
begin
  -- Thứ tự khóa chung: students -> rewards -> reward_requests (mỗi nhóm theo id).
  perform 1 from (select s.id from public.students s where s.class_id = p_class_id order by s.id for no key update) l;
  perform 1 from (select w.id from public.rewards w
                   where w.class_id = p_class_id
                     and w.id in (select rr.reward_id from public.reward_requests rr
                                   where rr.class_id = p_class_id and rr.status = 'pending')
                   order by w.id for update) l;
  for r in select rr.id from public.reward_requests rr
            where rr.class_id = p_class_id and rr.status = 'pending'
            order by rr.id for update
  loop
    perform private.reject_request_locked(r.id);
    v_rejected := v_rejected + 1;
  end loop;

  update public.classes set archived_at = coalesce(archived_at, now()) where id = p_class_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (p_class_id, (select auth.uid()), 'class_archived', 'class', p_class_id,
          jsonb_build_object('rejected_requests', v_rejected));
  return v_rejected;
end;
$$;
revoke execute on function private.close_class(uuid) from public, anon, authenticated;

-- 6) Sao lưu: giáo viên của lớp, hoặc chủ sở hữu (owner_id) của lớp đã lưu trữ.
create function public.export_class_backup(p_class_id uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.classes;
  t text;
  v_tables jsonb := '{}'::jsonb;
  v_rows jsonb;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  select * into c from public.classes where id = p_class_id;
  if not found or not (p_class_id = private.my_class_id() or c.owner_id = (select auth.uid())) then
    raise exception 'not_allowed';
  end if;

  foreach t in array private.backup_tables() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at%s), ''[]''::jsonb) from public.%I x where x.class_id = $1',
                   case when t = 'class_settings' then '' else ', x.id' end, t)
      into v_rows using p_class_id;
    v_tables := v_tables || jsonb_build_object(t, v_rows);
  end loop;

  return jsonb_build_object(
    'format', 'tram-khong-gian-backup',
    'version', 1,
    'exported_at', now(),
    'class', to_jsonb(c) - 'owner_id' - 'archived_at',
    'tables', v_tables);
end;
$$;

-- 7) Khôi phục vào một lớp MỚI; lớp hiện tại được đóng (lưu trữ); giáo viên chuyển sang lớp mới.
--    Sổ sao chỉ chèn (trigger chặn sửa/xóa vẫn bật). Dòng reversal chèn sau các dòng khác để trigger kiểm gốc đúng.
create function public.restore_class_backup(p_backup jsonb) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_current uuid;
  v_old uuid;
  v_new uuid := gen_random_uuid();
  v_cls jsonb;
  v_rows jsonb;
  v_avatar uuid;
  v_paths jsonb;
  t text;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  if not private.backup_valid(p_backup) then raise exception 'invalid_backup'; end if;

  -- Một giáo viên khôi phục một lần tại một thời điểm.
  perform 1 from public.profiles p where p.id = v_user for update;
  v_current := private.my_class_id();
  v_old := (p_backup #>> '{class,id}')::uuid;

  begin
    v_cls := jsonb_build_object('school_name', '', 'class_name', '', 'school_year', '', 'teacher_name', '',
                                'slogan', '', 'theme', 'indigo')
             || (p_backup -> 'class')
             || jsonb_build_object(
                  'id', v_new, 'owner_id', v_user, 'archived_at', null::text, 'created_at', now(),
                  'logo_path', private.backup_remap_path(p_backup #> '{class,logo_path}', v_old, v_new),
                  'class_logo_path', private.backup_remap_path(p_backup #> '{class,class_logo_path}', v_old, v_new),
                  'cover_path', private.backup_remap_path(p_backup #> '{class,cover_path}', v_old, v_new));
    insert into public.classes select (jsonb_populate_record(null::public.classes, v_cls)).*;
    -- Trigger classes_create_settings vừa tạo dòng mặc định; thay bằng cài đặt trong bản sao lưu.
    delete from public.class_settings where class_id = v_new;

    foreach t in array private.backup_tables() loop
      select coalesce(jsonb_agg(private.backup_remap_row(t, x.e, v_old, v_new) order by x.n), '[]'::jsonb) into v_rows
        from jsonb_array_elements(p_backup -> 'tables' -> t) with ordinality x(e, n);
      if t = 'star_transactions' then
        execute 'insert into public.star_transactions select r.* from jsonb_populate_recordset(null::public.star_transactions, $1) r
                  where r.kind <> ''reversal'' order by r.created_at, r.id' using v_rows;
        execute 'insert into public.star_transactions select r.* from jsonb_populate_recordset(null::public.star_transactions, $1) r
                  where r.kind = ''reversal'' order by r.created_at, r.id' using v_rows;
      else
        execute format('insert into public.%I select r.* from jsonb_populate_recordset(null::public.%I, $1) r', t, t) using v_rows;
      end if;
    end loop;
  exception when others then
    -- Mọi lỗi dữ liệu (kiểu sai, khóa ngoại mồ côi, vi phạm ràng buộc hoặc trigger) = file không dùng được; hoàn tác trọn vẹn.
    raise exception 'invalid_backup';
  end;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_new, v_user, 'class_restored', 'class', v_new, jsonb_build_object('from_class_id', v_old));

  -- Avatar của giáo viên: dùng bản sao ở lớp mới nếu có, không thì bỏ (khóa ngoại gắn avatar với lớp).
  select a.id into v_avatar
    from public.profiles p
    join public.avatar_library a on a.class_id = v_new and a.id = private.backup_new_id(v_new, p.avatar_id::text)
   where p.id = v_user and p.avatar_id is not null;

  perform private.close_class(v_current);
  update public.profiles set class_id = v_new, avatar_id = v_avatar where id = v_user;

  select coalesce(jsonb_agg(jsonb_build_object('from', v_old::text || '/' || substr(d.p, char_length(v_new::text) + 2), 'to', d.p) order by d.p), '[]'::jsonb)
    into v_paths
    from (select distinct u.p from (
            select image_path as p from public.avatar_library where class_id = v_new
            union all select image_path from public.rewards where class_id = v_new
            union all select image_path from public.announcements where class_id = v_new
            union all select unnest(array[logo_path, class_logo_path, cover_path]) from public.classes where id = v_new
          ) u where u.p is not null) d;

  return jsonb_build_object('classId', v_new, 'imagePaths', v_paths);
end;
$$;

-- 8) Các năm học đã lưu trữ của giáo viên (RLS không cho đọc lớp đã lưu trữ qua my_class_id).
create function public.my_archived_classes()
returns table (id uuid, class_name text, school_year text, archived_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  return query
    select c.id, c.class_name, c.school_year, c.archived_at
      from public.classes c
     where c.owner_id = (select auth.uid()) and c.archived_at is not null
     order by c.archived_at desc, c.id;
end;
$$;

revoke execute on function public.export_class_backup(uuid) from public, anon;
revoke execute on function public.restore_class_backup(jsonb) from public, anon;
revoke execute on function public.my_archived_classes() from public, anon;
grant execute on function public.export_class_backup(uuid) to authenticated;
grant execute on function public.restore_class_backup(jsonb) to authenticated;
grant execute on function public.my_archived_classes() to authenticated;
