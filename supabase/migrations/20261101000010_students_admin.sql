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
  select coalesce(max(substring(s.code from '^HS(\d+)$')::int), 0) + 1 into v_n
    from public.students s
   where s.class_id = p_class_id and s.code ~ '^HS\d+$';
  return 'HS' || lpad(v_n::text, 2, '0');
end
$$;

revoke execute on function public.next_student_code(uuid) from public, anon;
grant execute on function public.next_student_code(uuid) to authenticated;

-- Nhập hàng loạt học sinh từ file. Cả lô trong một câu lệnh: một dòng lỗi (vd. trùng mã, 23505) thì không dòng nào được thêm.
-- p_rows: [{ "roll_no": int|null, "full_name": text, "code": text|null }, ...]
-- Dòng thiếu mã được sinh mã tiếp theo số HS lớn nhất (tính cả học sinh đã lưu trữ và mã ghi rõ trong lô); dòng thiếu số thứ tự cũng tiếp nối.
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
  if exists (
    select 1 from jsonb_array_elements(p_rows) e
     where jsonb_typeof(e) <> 'object'
        or length(btrim(coalesce(e->>'full_name', ''))) not between 1 and 200
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

  -- Khóa theo lớp để hai lần nhập cùng lúc không sinh trùng mã.
  perform pg_advisory_xact_lock(hashtextextended('import_students:' || v_class::text, 0));

  select greatest(
           coalesce((select max(substring(s.code from '^HS(\d+)$')::int) from public.students s
                      where s.class_id = v_class and s.code ~ '^HS\d+$'), 0),
           coalesce((select max(substring(btrim(e->>'code') from '^HS(\d+)$')::int)
                       from jsonb_array_elements(p_rows) e where btrim(e->>'code') ~ '^HS\d+$'), 0)),
         greatest(
           coalesce((select max(s.roll_no) from public.students s where s.class_id = v_class), 0),
           coalesce((select max((e->>'roll_no')::int) from jsonb_array_elements(p_rows) e where nullif(e->>'roll_no', '') is not null), 0))
    into v_code_base, v_roll_base;

  insert into public.students (class_id, code, roll_no, full_name)
  select v_class,
         coalesce(nullif(btrim(r.e->>'code'), ''),
                  'HS' || lpad((v_code_base + count(*) filter (where nullif(btrim(r.e->>'code'), '') is null) over (order by r.ord))::text, 2, '0')),
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
