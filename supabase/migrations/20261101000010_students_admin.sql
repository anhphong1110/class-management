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
