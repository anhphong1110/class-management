-- Hộp thư giáo viên: học sinh nhắn riêng cho cô/thầy của lớp, giáo viên trả lời trong cùng một luồng.
-- Mỗi học sinh có đúng một hội thoại với lớp (mọi giáo viên của lớp đều đọc và trả lời được).
-- Bảng chỉ cho đọc qua RLS; mọi thao tác ghi đi qua hàm security definer (send_message, mark_conversation_read).
-- Trạng thái suy ra từ dữ liệu: hội thoại "chờ giáo viên phản hồi" khi last_sender_role = 'student';
-- tin "đã đọc" khi read_at có giá trị.

-- 1) Bảng.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_sender_role public.user_role,
  unique (class_id, id),
  unique (class_id, student_id),
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  conversation_id uuid not null,
  sender_role public.user_role not null,
  -- Tài khoản bị xóa thì giữ tin, bỏ người gửi. Khi khôi phục từ sao lưu luôn là null.
  sender_id uuid references public.profiles on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  -- Do trình duyệt tạo; gửi lại cùng client_id không tạo thêm dòng.
  client_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (conversation_id, client_id),
  foreign key (class_id, conversation_id) references public.conversations (class_id, id) on delete restrict
);

create index on public.conversations (class_id, last_message_at desc);
create index on public.messages (conversation_id, created_at);
-- Đếm tin chưa đọc theo lớp và bên gửi (huy hiệu số).
create index messages_unread_idx on public.messages (class_id, sender_role) where read_at is null;
-- Chống spam theo người gửi, và khóa ngoại sender_id.
create index on public.messages (sender_id, created_at) where sender_id is not null;
create index on public.messages (class_id, conversation_id);

-- 2) Cờ cài đặt: học sinh được nhắn tin cho cô (mặc định bật).
alter table public.class_settings add column student_can_message boolean not null default true;

-- 3) RLS: chỉ select. Không có policy insert/update/delete nên authenticated không ghi trực tiếp được.
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.messages from anon;
revoke insert, update, delete, truncate, references, trigger on public.conversations, public.messages from authenticated;

create policy teacher_select on public.conversations for select to authenticated
  using (private.is_teacher() and class_id = (select private.my_class_id()));
create policy student_select on public.conversations for select to authenticated
  using (student_id = (select private.my_student_id()) and (select private.setting_on('student_can_message')));

create policy teacher_select on public.messages for select to authenticated
  using (private.is_teacher() and class_id = (select private.my_class_id()));
create policy student_select on public.messages for select to authenticated
  using ((select private.setting_on('student_can_message'))
         and exists (select 1 from public.conversations c
                      where c.class_id = messages.class_id and c.id = messages.conversation_id
                        and c.student_id = (select private.my_student_id())));

-- 4) Gửi tin. Học sinh: gửi cho lớp của mình (bỏ qua p_student_id), cờ phải bật.
--    Giáo viên: p_student_id phải là học sinh chưa lưu trữ của lớp mình.
--    Lỗi: not_allowed, student_not_found, message_invalid, rate_limited.
create function public.send_message(p_body text, p_client_id uuid, p_student_id uuid default null)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_class uuid;
  v_student uuid;
  v_role public.user_role;
  v_conv uuid;
  m public.messages;
begin
  if v_uid is null then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  if private.is_teacher() then
    v_role := 'teacher';
    perform 1 from public.students s
     where s.id = p_student_id and s.class_id = v_class and s.archived_at is null for key share;
    if not found then raise exception 'student_not_found'; end if;
    v_student := p_student_id;
  else
    v_student := private.my_student_id();
    if v_student is null or not private.setting_on('student_can_message') then raise exception 'not_allowed'; end if;
    v_role := 'student';
  end if;

  if p_body is null or p_client_id is null
     or char_length(btrim(p_body)) not between 1 and 2000 then
    raise exception 'message_invalid';
  end if;

  insert into public.conversations (class_id, student_id) values (v_class, v_student)
  on conflict (class_id, student_id) do update set class_id = excluded.class_id
  returning id into v_conv;

  -- Gửi lại cùng client_id: trả dòng cũ, không tính vào giới hạn.
  select * into m from public.messages x where x.conversation_id = v_conv and x.client_id = p_client_id;
  if found then return m; end if;

  -- Tối đa 5 tin trong 30 giây cho mỗi tài khoản (khóa theo người gửi để hai lần gửi song song không lọt).
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if (select count(*) from public.messages x
       where x.sender_id = v_uid and x.created_at > now() - interval '30 seconds') >= 5 then
    raise exception 'rate_limited';
  end if;

  insert into public.messages (class_id, conversation_id, sender_role, sender_id, body, client_id)
  values (v_class, v_conv, v_role, v_uid, btrim(p_body), p_client_id)
  on conflict (conversation_id, client_id) do nothing
  returning * into m;
  if not found then
    select * into m from public.messages x where x.conversation_id = v_conv and x.client_id = p_client_id;
    return m;
  end if;

  update public.conversations set last_message_at = m.created_at, last_sender_role = v_role where id = v_conv;
  return m;
end;
$$;

-- 5) Đánh dấu đã đọc các tin của BÊN KIA. Học sinh chỉ hội thoại của mình, giáo viên mọi hội thoại trong lớp.
--    Trả số tin vừa đánh dấu. Lỗi: not_allowed, conversation_not_found.
create function public.mark_conversation_read(p_conversation_id uuid) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid;
  v_other public.user_role;
  v_n int;
begin
  if (select auth.uid()) is null then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if v_class is null then raise exception 'not_allowed'; end if;

  if private.is_teacher() then
    v_other := 'student';
  else
    v_student := private.my_student_id();
    if v_student is null or not private.setting_on('student_can_message') then raise exception 'not_allowed'; end if;
    v_other := 'teacher';
  end if;

  perform 1 from public.conversations c
   where c.id = p_conversation_id and c.class_id = v_class
     and (v_student is null or c.student_id = v_student);
  if not found then raise exception 'conversation_not_found'; end if;

  update public.messages m set read_at = now()
   where m.class_id = v_class and m.conversation_id = p_conversation_id
     and m.sender_role = v_other and m.read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 6) Số tin chưa đọc: học sinh đếm tin của cô gửi em, giáo viên đếm tin học sinh gửi trong lớp. Không có quyền thì 0.
create function public.inbox_unread_count() returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid;
  v_n int;
begin
  if (select auth.uid()) is null then return 0; end if;
  v_class := private.my_class_id();
  if v_class is null then return 0; end if;

  if private.is_teacher() then
    select count(*)::int into v_n from public.messages m
     where m.class_id = v_class and m.sender_role = 'student' and m.read_at is null;
    return v_n;
  end if;

  v_student := private.my_student_id();
  if v_student is null or not private.setting_on('student_can_message') then return 0; end if;
  select count(*)::int into v_n
    from public.messages m
    join public.conversations c on c.class_id = m.class_id and c.id = m.conversation_id
   where c.student_id = v_student and m.class_id = v_class
     and m.sender_role = 'teacher' and m.read_at is null;
  return v_n;
end;
$$;

revoke all on function public.send_message(text, uuid, uuid) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
revoke all on function public.inbox_unread_count() from public, anon;
grant execute on function public.send_message(text, uuid, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.inbox_unread_count() to authenticated;

-- 7) Realtime (áp RLS select). Bỏ qua nếu môi trường không có publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.conversations, public.messages;
  end if;
end $$;

-- 8) Cờ mới được phép sửa trong cài đặt lớp (bản sao bản mới nhất ở 20261101000022, thêm student_can_message).
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
                'student_can_view_news', 'student_can_change_avatar', 'student_can_message') then
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

-- 9) Sao lưu: thêm conversations, messages sau student_badges (conversations trước messages theo khóa ngoại).
--    Bản sao lưu cũ thiếu hai khóa này vẫn hợp lệ và khôi phục được (khôi phục bỏ qua khóa thiếu).
create or replace function private.backup_tables() returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['avatar_library', 'students', 'groups', 'group_members', 'star_criteria', 'rewards',
               'reward_requests', 'star_transactions', 'subjects', 'timetable_slots',
               'announcements', 'missions', 'mission_completions', 'badges', 'student_badges',
               'conversations', 'messages', 'class_settings']
$$;

create or replace function private.backup_valid(p jsonb) returns boolean
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
    -- Bản sao lưu cũ chưa có hộp thư: thiếu khóa conversations/messages vẫn hợp lệ.
    if rows is null and t in ('conversations', 'messages') then continue; end if;
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
    when 'conversations' then array['student_id']
    when 'messages' then array['conversation_id']
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
  -- Hồ sơ đăng nhập không nằm trong bản sao lưu: người gửi tin luôn về null (vai gửi nằm ở sender_role).
  if p_table = 'messages' then
    v := v || jsonb_build_object('sender_id', null::text);
  end if;
  foreach c in array paths loop
    v := v || jsonb_build_object(c, private.backup_remap_path(v -> c, p_old, p_new));
  end loop;
  return v;
end;
$$;

-- 10) Tin nhắn đi theo học sinh: xóa dữ liệu demo và xóa học sinh dọn luôn hội thoại.
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
  delete from public.messages m using public.conversations c
   where c.class_id = m.class_id and c.id = m.conversation_id and c.class_id = v_class and c.student_id = any (v_students);
  delete from public.conversations where class_id = v_class and student_id = any (v_students);
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
  delete from public.messages m using public.conversations c
   where c.class_id = m.class_id and c.id = m.conversation_id and c.class_id = v_class and c.student_id = p_student_id;
  delete from public.conversations where class_id = v_class and student_id = p_student_id;
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
