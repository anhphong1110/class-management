-- Hàm cộng, trừ, hoàn tác sao. Sổ sao chỉ ghi thêm; mọi thay đổi sao đi qua các hàm này.

-- Sổ append-only: chặn cả UPDATE/DELETE của vai có BYPASSRLS.
create function private.star_ledger_immutable() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ledger_immutable';
end;
$$;

create trigger star_transactions_immutable
  before update or delete on public.star_transactions
  for each row execute function private.star_ledger_immutable();

-- Lõi dùng chung cho cộng/trừ. Không cấp cho authenticated; chỉ hai hàm public gọi.
create function private.change_stars(
  p_kind public.star_kind, p_student_ids uuid[], p_points int, p_criterion_id uuid, p_note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_ids uuid[];
  v_locked uuid[];
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_batch uuid := gen_random_uuid();
  v_short uuid[];
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select coalesce(array_agg(distinct x), '{}') into v_ids
    from unnest(coalesce(p_student_ids, '{}')) as x where x is not null;
  if cardinality(v_ids) = 0 then raise exception 'no_students'; end if;
  if p_points is null or p_points < 1 or p_points > 100 then raise exception 'invalid_points'; end if;
  if p_criterion_id is null and v_note is null then raise exception 'reason_required'; end if;
  if p_criterion_id is not null and not exists (
    select 1 from public.star_criteria c
     where c.id = p_criterion_id and c.class_id = v_class
       and c.archived_at is null and c.kind::text = p_kind::text) then
    raise exception 'criterion_mismatch';
  end if;

  -- Khóa học sinh theo thứ tự id rồi mới đọc số dư.
  select coalesce(array_agg(id order by id), '{}') into v_locked from (
    select s.id from public.students s
     where s.id = any(v_ids) and s.class_id = v_class and s.archived_at is null
     order by s.id for update) l;
  if cardinality(v_locked) <> cardinality(v_ids) then raise exception 'student_not_found'; end if;

  if p_kind = 'penalty' then
    select array_agg(s_id order by s_id) into v_short from (
      select u as s_id from unnest(v_ids) u
       where coalesce((select sum(t.delta) from public.star_transactions t
                        where t.class_id = v_class and t.student_id = u), 0) < p_points) q;
    if v_short is not null then
      raise exception 'insufficient_stars'
        using detail = array_to_string(v_short, ',');
    end if;
  end if;

  insert into public.star_transactions (class_id, student_id, delta, kind, criterion_id, note, batch_id, actor_id)
  select v_class, u, case when p_kind = 'award' then p_points else -p_points end,
         p_kind, p_criterion_id, v_note, v_batch, (select auth.uid())
    from unnest(v_ids) u;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()),
          case when p_kind = 'award' then 'stars.award' else 'stars.penalize' end,
          'star_batch', v_batch,
          jsonb_build_object('student_ids', v_ids, 'points', p_points,
                             'criterion_id', p_criterion_id, 'note', v_note));
  return v_batch;
end;
$$;
revoke execute on function private.change_stars(public.star_kind, uuid[], int, uuid, text) from public, anon, authenticated;

create function public.award_stars(p_student_ids uuid[], p_points int, p_criterion_id uuid, p_note text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.change_stars('award', p_student_ids, p_points, p_criterion_id, p_note)
$$;

create function public.penalize_stars(p_student_ids uuid[], p_points int, p_criterion_id uuid, p_note text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.change_stars('penalty', p_student_ids, p_points, p_criterion_id, p_note)
$$;

create function public.reverse_batch(p_batch_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_new uuid := gen_random_uuid();
  v_student_ids uuid[];
  v_short uuid[];
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select array_agg(distinct t.student_id) into v_student_ids
    from public.star_transactions t
   where t.class_id = v_class and t.batch_id = p_batch_id;
  if v_student_ids is null then raise exception 'batch_not_found'; end if;

  -- Khóa học sinh (kể cả đã lưu trữ) trước khi đọc số dư và kiểm tra đã hoàn tác.
  perform 1 from (select s.id from public.students s
                   where s.id = any(v_student_ids) and s.class_id = v_class
                   order by s.id for update) l;

  if exists (select 1 from public.star_transactions t
              where t.class_id = v_class and t.batch_id = p_batch_id and t.kind = 'reversal')
     or exists (select 1 from public.star_transactions r
                 join public.star_transactions o on o.class_id = r.class_id and o.id = r.reverses_id
                where r.class_id = v_class and o.batch_id = p_batch_id) then
    raise exception 'already_reversed';
  end if;

  -- Hoàn tác batch cộng: học sinh phải còn đủ sao khả dụng.
  select array_agg(o.student_id order by o.student_id) into v_short
    from public.star_transactions o
   where o.class_id = v_class and o.batch_id = p_batch_id and o.kind = 'award'
     and coalesce((select sum(t.delta) from public.star_transactions t
                    where t.class_id = v_class and t.student_id = o.student_id), 0) < o.delta;
  if v_short is not null then
    raise exception 'insufficient_stars' using detail = array_to_string(v_short, ',');
  end if;

  insert into public.star_transactions (class_id, student_id, delta, kind, reverses_id, batch_id, actor_id)
  select o.class_id, o.student_id, -o.delta, 'reversal', o.id, v_new, (select auth.uid())
    from public.star_transactions o
   where o.class_id = v_class and o.batch_id = p_batch_id and o.kind in ('award', 'penalty');

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'stars.reverse', 'star_batch', v_new,
          jsonb_build_object('reverses_batch_id', p_batch_id));
  return v_new;
end;
$$;

revoke execute on function public.award_stars(uuid[], int, uuid, text) from public, anon;
revoke execute on function public.penalize_stars(uuid[], int, uuid, text) from public, anon;
revoke execute on function public.reverse_batch(uuid) from public, anon;
grant execute on function public.award_stars(uuid[], int, uuid, text) to authenticated;
grant execute on function public.penalize_stars(uuid[], int, uuid, text) to authenticated;
grant execute on function public.reverse_batch(uuid) to authenticated;
