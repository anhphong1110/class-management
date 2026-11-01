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
    -- Cài đặt lớp: đúng một dòng.
    if t = 'class_settings' and jsonb_array_length(rows) <> 1 then return false; end if;
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

-- 4) Đổi một dòng của bản sao lưu sang lớp mới: id, class_id, khóa ngoại, đường dẫn ảnh; người dùng khác giáo viên gọi thì null.
create function private.backup_remap_row(p_table text, p_row jsonb, p_old uuid, p_new uuid, p_user uuid) returns jsonb
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
revoke execute on function private.backup_remap_row(text, jsonb, uuid, uuid, uuid) from public, anon, authenticated;

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
  -- Lớp đã lưu trữ rồi: không làm gì, không ghi nhật ký lần nữa.
  if exists (select 1 from public.classes c where c.id = p_class_id and c.archived_at is not null) then
    return 0;
  end if;

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
  v_cols text;
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

    -- Cờ giao dịch: rewards_audit bỏ qua dòng quà chèn khi khôi phục (chỉ vai không phải API mới có hiệu lực).
    perform set_config('app.restoring', 'on', true);

    foreach t in array private.backup_tables() loop
      select coalesce(jsonb_agg(private.backup_remap_row(t, x.e, v_old, v_new, v_user) order by x.n), '[]'::jsonb) into v_rows
        from jsonb_array_elements(p_backup -> 'tables' -> t) with ordinality x(e, n);
      continue when jsonb_array_length(v_rows) = 0;
      -- Danh sách cột: cột có thật của bảng VÀ có mặt ở mọi dòng. Cột thiếu lấy giá trị mặc định,
      -- khóa lạ bị bỏ.
      select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into v_cols
        from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = t and c.is_generated = 'NEVER'
         and not exists (select 1 from jsonb_array_elements(v_rows) e where not (e ? c.column_name));
      if t = 'star_transactions' then
        execute format('insert into public.star_transactions (%1$s) select %1$s from jsonb_populate_recordset(null::public.star_transactions, $1) r
                         where r.kind <> ''reversal'' order by r.created_at, r.id', v_cols) using v_rows;
        execute format('insert into public.star_transactions (%1$s) select %1$s from jsonb_populate_recordset(null::public.star_transactions, $1) r
                         where r.kind = ''reversal'' order by r.created_at, r.id', v_cols) using v_rows;
      else
        execute format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_recordset(null::public.%1$I, $1) r', t, v_cols) using v_rows;
      end if;
    end loop;

    -- Bất biến của sổ sao và kho: file chế tay không được phá chúng.
    if exists (select 1 from public.star_transactions st where st.class_id = v_new
                group by st.student_id having sum(st.delta) < 0)
       or exists (select 1 from public.rewards w
                   where w.class_id = v_new
                     and w.stock < (select count(*) from public.reward_requests rr
                                     where rr.class_id = v_new and rr.reward_id = w.id and rr.status = 'pending')) then
      raise exception 'invalid_backup';
    end if;
    perform set_config('app.restoring', 'off', true);
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

-- 9) rewards_audit: không ghi reward_created cho quà chèn khi khôi phục (cờ app.restoring chỉ đặt trong restore_class_backup, theo giao dịch; vai API không có đường nào để đặt GUC).
create or replace function private.audit_reward() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.restoring', true), '') = 'on' then return new; end if;
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

-- 10) Kho tạm cho file sao lưu: tải lên/tải xuống qua Storage thay vì thân Server Action (Vercel giới hạn 4,5 MB).
--     Bucket riêng (class-media chỉ nhận ảnh 5 MB). Đường dẫn <class_id>/<tên>.json; chỉ giáo viên của lớp đó,
--     học sinh không đọc được.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('class-backups', 'class-backups', false, 20971520, array['application/json'])
on conflict (id) do update
  set public = false, file_size_limit = 20971520, allowed_mime_types = array['application/json'];

create policy class_backups_teacher_select on storage.objects for select to authenticated
  using (bucket_id = 'class-backups' and private.is_teacher()
         and (storage.foldername(name))[1] = (select private.my_class_id())::text);
create policy class_backups_teacher_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'class-backups' and private.is_teacher()
              and (storage.foldername(name))[1] = (select private.my_class_id())::text);
create policy class_backups_teacher_delete on storage.objects for delete to authenticated
  using (bucket_id = 'class-backups' and private.is_teacher()
         and (storage.foldername(name))[1] = (select private.my_class_id())::text);

revoke execute on function public.export_class_backup(uuid) from public, anon;
revoke execute on function public.restore_class_backup(jsonb) from public, anon;
revoke execute on function public.my_archived_classes() from public, anon;
grant execute on function public.export_class_backup(uuid) to authenticated;
grant execute on function public.restore_class_backup(jsonb) to authenticated;
grant execute on function public.my_archived_classes() to authenticated;

-- ===================================================================================================
-- Đợt 6, Task 7: mở năm học mới và xóa dữ liệu demo.
-- ===================================================================================================

-- 11) Mở năm học mới: tạo lớp mới (owner_id = giáo viên), chép danh mục đã chọn với id mới, đóng lớp cũ bằng
--     private.close_class (từ chối yêu cầu pending, trả sao giữ, đặt archived_at), chuyển giáo viên sang lớp mới.
--     Không chép học sinh, sổ sao, điểm danh, thông báo; bản sao danh mục luôn is_demo = false.
--     Khóa: close_class khóa students (FOR NO KEY UPDATE) -> rewards -> reward_requests của lớp cũ; phần chép chỉ
--     chạm dòng của lớp mới nên không đảo thứ tự khóa.
create function public.start_new_school_year(p jsonb) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_old uuid;
  o public.classes;
  v_new uuid := gen_random_uuid();
  v_copy text[] := array[]::text[];
  v_allowed constant text[] := array['subjects', 'timetable', 'criteria', 'rewards', 'avatars', 'settings', 'missions'];
  v_year text;
  v_name text;
  v_theme text;
  v_avatar uuid;
  v_cols text;
  k text;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'invalid_input'; end if;

  -- Bắt buộc: năm học, tên lớp. Tùy chọn: school_name, teacher_name, slogan, theme (chuỗi hoặc null).
  foreach k in array array['school_year', 'class_name', 'school_name', 'teacher_name', 'slogan', 'theme'] loop
    if jsonb_typeof(p -> k) not in ('string', 'null') and (p -> k) is not null then raise exception 'invalid_input'; end if;
    if char_length(coalesce(p ->> k, '')) > 200 then raise exception 'invalid_input'; end if;
  end loop;
  v_year := btrim(coalesce(p ->> 'school_year', ''));
  v_name := btrim(coalesce(p ->> 'class_name', ''));
  if v_year = '' or v_name = '' then raise exception 'invalid_input'; end if;
  v_theme := nullif(btrim(coalesce(p ->> 'theme', '')), '');
  if v_theme is not null and v_theme not in ('indigo', 'pink', 'mint', 'gold') then raise exception 'invalid_input'; end if;

  if (p -> 'copy') is not null and jsonb_typeof(p -> 'copy') <> 'null' then
    if jsonb_typeof(p -> 'copy') <> 'array'
       or exists (select 1 from jsonb_array_elements(p -> 'copy') e
                   where jsonb_typeof(e) <> 'string' or (e #>> '{}') <> all (v_allowed)) then
      raise exception 'invalid_input';
    end if;
    select coalesce(array_agg(distinct e #>> '{}'), array[]::text[]) into v_copy from jsonb_array_elements(p -> 'copy') e;
  end if;
  -- Thời khóa biểu trỏ vào môn học, nên chép thời khóa biểu thì phải chép cả môn.
  if 'timetable' = any (v_copy) and not 'subjects' = any (v_copy) then raise exception 'invalid_input'; end if;

  -- Một giáo viên mở năm học một lần tại một thời điểm.
  perform 1 from public.profiles pr where pr.id = v_user for update;
  v_old := private.my_class_id();
  if v_old is null then raise exception 'not_allowed'; end if;
  select * into o from public.classes c where c.id = v_old and c.archived_at is null;
  if not found then raise exception 'not_allowed'; end if;

  -- 1) Lớp mới. Trigger classes_create_settings tạo dòng class_settings mặc định.
  insert into public.classes (id, school_name, class_name, school_year, teacher_name, slogan, theme,
                              logo_path, class_logo_path, cover_path, owner_id)
  values (v_new,
          coalesce(nullif(btrim(coalesce(p ->> 'school_name', '')), ''), o.school_name),
          v_name, v_year,
          coalesce(nullif(btrim(coalesce(p ->> 'teacher_name', '')), ''), o.teacher_name),
          coalesce(nullif(btrim(coalesce(p ->> 'slogan', '')), ''), o.slogan),
          coalesce(v_theme, o.theme),
          private.backup_remap_path(to_jsonb(o.logo_path), v_old, v_new),
          private.backup_remap_path(to_jsonb(o.class_logo_path), v_old, v_new),
          private.backup_remap_path(to_jsonb(o.cover_path), v_old, v_new),
          v_user);

  -- Quà chèn khi mở năm mới không ghi reward_created từng dòng (đã có một dòng school_year_opened).
  perform set_config('app.restoring', 'on', true);

  if 'avatars' = any (v_copy) then
    insert into public.avatar_library (id, class_id, kind, preset, image_path, label, hidden)
    select private.backup_new_id(v_new, a.id::text), v_new, a.kind, a.preset,
           private.backup_remap_path(to_jsonb(a.image_path), v_old, v_new), a.label, a.hidden
      from public.avatar_library a where a.class_id = v_old;
  end if;
  if 'subjects' = any (v_copy) then
    insert into public.subjects (id, class_id, name, color, sort_order)
    select private.backup_new_id(v_new, s.id::text), v_new, s.name, s.color, s.sort_order
      from public.subjects s where s.class_id = v_old;
  end if;
  if 'timetable' = any (v_copy) then
    insert into public.timetable_slots (class_id, weekday, session, period, subject_id)
    select v_new, t.weekday, t.session, t.period,
           case when t.subject_id is null then null else private.backup_new_id(v_new, t.subject_id::text) end
      from public.timetable_slots t where t.class_id = v_old;
  end if;
  if 'criteria' = any (v_copy) then
    insert into public.star_criteria (id, class_id, label, kind, default_points, sort_order, archived_at)
    select private.backup_new_id(v_new, c.id::text), v_new, c.label, c.kind, c.default_points, c.sort_order, c.archived_at
      from public.star_criteria c where c.class_id = v_old;
  end if;
  if 'rewards' = any (v_copy) then
    insert into public.rewards (id, class_id, name, cost, description, image_path, icon, stock, hidden)
    select private.backup_new_id(v_new, w.id::text), v_new, w.name, w.cost, w.description,
           private.backup_remap_path(to_jsonb(w.image_path), v_old, v_new), w.icon, w.stock, w.hidden
      from public.rewards w where w.class_id = v_old;
  end if;
  if 'missions' = any (v_copy) then
    insert into public.missions (id, class_id, name, period, condition, reward_stars, active)
    select private.backup_new_id(v_new, m.id::text), v_new, m.name, m.period, m.condition, m.reward_stars, m.active
      from public.missions m where m.class_id = v_old;
    insert into public.badges (id, class_id, name, icon, gradient)
    select private.backup_new_id(v_new, b.id::text), v_new, b.name, b.icon, b.gradient
      from public.badges b where b.class_id = v_old;
  end if;
  if 'settings' = any (v_copy) then
    -- Mọi cờ cài đặt của lớp cũ, trừ khóa lớp, mốc tạo và cờ demo.
    select string_agg(format('%I', c.column_name), ', ' order by c.ordinal_position) into v_cols
      from information_schema.columns c
     where c.table_schema = 'public' and c.table_name = 'class_settings'
       and c.column_name not in ('class_id', 'created_at', 'is_demo');
    execute format('update public.class_settings n set (%1$s) = (select %1$s from public.class_settings s where s.class_id = $1) where n.class_id = $2', v_cols)
      using v_old, v_new;
  end if;
  perform set_config('app.restoring', 'off', true);

  -- Avatar của giáo viên: dùng bản sao ở lớp mới nếu có, không thì bỏ (khóa ngoại gắn avatar với lớp).
  select a.id into v_avatar
    from public.profiles pr
    join public.avatar_library a on a.class_id = v_new and a.id = private.backup_new_id(v_new, pr.avatar_id::text)
   where pr.id = v_user and pr.avatar_id is not null;

  -- 2) Đóng lớp cũ.
  perform private.close_class(v_old);

  -- 3) Giáo viên sang lớp mới.
  update public.profiles set class_id = v_new, avatar_id = v_avatar where id = v_user;

  -- 4) Nhật ký.
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_new, v_user, 'school_year_opened', 'class', v_new,
          jsonb_build_object('from_class_id', v_old, 'school_year', v_year, 'copy', to_jsonb(v_copy)));
  return v_new;
end;
$$;

-- 12) Sổ sao chỉ được xóa khi xóa dữ liệu demo: cờ giao dịch app.demo_purge = 'on' (chỉ delete_demo_data đặt),
--     vai gọi không phải vai API (authenticated/anon/service_role; hàm definer chạy bằng vai chủ sở hữu, nên
--     người dùng đặt GUC từ SQL không qua được), và dòng thuộc học sinh demo. UPDATE luôn bị chặn.
create or replace function private.star_ledger_immutable() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.demo_purge', true), '') = 'on'
     and current_user not in ('authenticated', 'anon', 'service_role')
     and exists (select 1 from public.students s where s.id = old.student_id and s.is_demo) then
    return old;
  end if;
  raise exception 'ledger_immutable';
end;
$$;

-- 13) Xóa dữ liệu demo của lớp hiện tại. Trả { deletedStudents, keptCatalog, authUserIds }; Server Action xóa tiếp
--     các tài khoản Auth. Dòng danh mục demo mà dữ liệu thật còn tham chiếu được giữ lại (khóa ngoại SET NULL
--     sẽ làm mất liên kết của dữ liệu thật nếu xóa).
--     Khóa: students demo (FOR NO KEY UPDATE) -> rewards demo -> reward_requests của học sinh demo.
create function public.delete_demo_data() returns jsonb
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
  delete from public.attendance where class_id = v_class and (student_id = any (v_students) or is_demo);
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

revoke execute on function public.start_new_school_year(jsonb) from public, anon;
revoke execute on function public.delete_demo_data() from public, anon;
grant execute on function public.start_new_school_year(jsonb) to authenticated;
grant execute on function public.delete_demo_data() to authenticated;
