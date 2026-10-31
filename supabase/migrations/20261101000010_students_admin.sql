-- Mã học sinh kế tiếp: HS + số lớn nhất hiện có + 1 (tính cả học sinh đã lưu trữ vì mã là duy nhất theo lớp).
create function public.next_student_code(p_class_id uuid) returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_n int;
begin
  if not private.is_teacher() or p_class_id is distinct from private.my_class_id() then
    raise exception 'not_allowed';
  end if;
  select coalesce(max(substring(s.code from '^HS([0-9]{1,6})$')::int), 0) + 1 into v_n
    from public.students s
   where s.class_id = p_class_id and s.code ~ '^HS[0-9]{1,6}$';
  return 'HS' || lpad(v_n::text, greatest(2, length(v_n::text)), '0');
end
$$;

revoke execute on function public.next_student_code(uuid) from public, anon;
grant execute on function public.next_student_code(uuid) to authenticated;

-- Nhập hàng loạt học sinh từ file. Cả lô trong một câu lệnh: một dòng lỗi (vd. trùng mã, 23505) thì không dòng nào được thêm.
-- p_rows: [{ "roll_no": int|null, "full_name": text, "code": text|null }, ...]
-- Mã được chuẩn hóa upper(btrim()). Dòng thiếu mã được sinh mã tiếp theo số HS lớn nhất (tính cả học sinh đã lưu trữ và mã ghi rõ trong lô); dòng thiếu số thứ tự cũng tiếp nối.
create function public.import_students(p_rows jsonb) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
  v_code_base int;
  v_roll_base int;
  v_count int;
begin
  if not private.is_teacher() or v_class is null then
    raise exception 'not_allowed';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'invalid_rows';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) e where jsonb_typeof(e) <> 'object') then
    raise exception 'invalid_rows';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
     where length(btrim(coalesce(e->>'full_name', ''))) not between 1 and 200
  ) then
    raise exception 'name_required';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
     where nullif(e->>'roll_no', '') is not null
       and ((e->>'roll_no') !~ '^[0-9]{1,4}$' or (e->>'roll_no')::int < 1)
  ) then
    raise exception 'invalid_roll_no';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
     where nullif(btrim(e->>'code'), '') is not null and upper(btrim(e->>'code')) !~ '^[A-Z0-9]{1,20}$'
  ) then
    raise exception 'invalid_rows';
  end if;

  -- Khóa theo lớp để hai lần nhập cùng lúc không sinh trùng mã.
  perform pg_advisory_xact_lock(hashtextextended('import_students:' || v_class::text, 0));

  -- Mã đã có trong lớp (kể cả học sinh đã lưu trữ).
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
      join public.students s on s.class_id = v_class and upper(s.code) = upper(btrim(e->>'code'))
  ) then
    raise exception 'code_exists';
  end if;

  select greatest(
           coalesce((select max(substring(upper(s.code) from '^HS([0-9]{1,6})$')::int) from public.students s
                      where s.class_id = v_class and upper(s.code) ~ '^HS[0-9]{1,6}$'), 0),
           coalesce((select max(substring(upper(btrim(e->>'code')) from '^HS([0-9]{1,6})$')::int)
                       from jsonb_array_elements(p_rows) e where upper(btrim(e->>'code')) ~ '^HS[0-9]{1,6}$'), 0)),
         greatest(
           coalesce((select max(s.roll_no) from public.students s where s.class_id = v_class), 0),
           coalesce((select max((e->>'roll_no')::int) from jsonb_array_elements(p_rows) e where nullif(e->>'roll_no', '') is not null), 0))
    into v_code_base, v_roll_base;

  insert into public.students (class_id, code, roll_no, full_name)
  select v_class,
         coalesce(nullif(upper(btrim(r.e->>'code')), ''),
                  'HS' || lpad((v_code_base + count(*) filter (where nullif(btrim(r.e->>'code'), '') is null) over (order by r.ord))::text,
                               greatest(2, length((v_code_base + count(*) filter (where nullif(btrim(r.e->>'code'), '') is null) over (order by r.ord))::text)), '0')),
         coalesce(nullif(r.e->>'roll_no', '')::int,
                  v_roll_base + count(*) filter (where nullif(r.e->>'roll_no', '') is null) over (order by r.ord)),
         btrim(r.e->>'full_name')
    from jsonb_array_elements(p_rows) with ordinality r(e, ord)
   order by r.ord;
  get diagnostics v_count = row_count;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'students.import', 'student', null,
          jsonb_build_object('class_id', v_class, 'count', v_count));
  return v_count;
end
$$;

revoke execute on function public.import_students(jsonb) from public, anon;
grant execute on function public.import_students(jsonb) to authenticated;
