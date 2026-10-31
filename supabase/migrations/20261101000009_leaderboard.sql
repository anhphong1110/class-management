-- Bảng xếp hạng theo kỳ và siết reverse_batch.

create function public.leaderboard_between(p_from timestamptz, p_to timestamptz)
returns table (student_id uuid, full_name text, avatar_id uuid, roll_no int, stars int, rank int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.avatar_id, s.roll_no,
         coalesce(sum(t.delta), 0)::int as stars,
         (rank() over (order by coalesce(sum(t.delta), 0) desc))::int as rank
    from public.students s
    left join public.star_transactions t
      on t.class_id = s.class_id and t.student_id = s.id
     and t.kind in ('award', 'penalty', 'reversal')
     and (p_from is null or t.created_at >= p_from)
     and (p_to is null or t.created_at < p_to)
   where s.class_id = private.my_class_id()
     and s.archived_at is null
     and (private.is_teacher() or private.setting_on('student_can_view_rank'))
   group by s.id, s.full_name, s.avatar_id, s.roll_no
   order by stars desc, s.roll_no asc
$$;

revoke execute on function public.leaderboard_between(timestamptz, timestamptz) from public, anon;
grant execute on function public.leaderboard_between(timestamptz, timestamptz) to authenticated;

-- Giữ chữ ký, quyền và hành vi của 0008; khác: batch không có dòng cộng/trừ/hoàn tác (không tồn tại, hoặc
-- chỉ gồm reserve/release/redeem) báo batch_not_found. Batch toàn dòng hoàn tác vẫn báo already_reversed.
create or replace function public.reverse_batch(p_batch_id uuid) returns uuid
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
   where t.class_id = v_class and t.batch_id = p_batch_id
     and t.kind in ('award', 'penalty', 'reversal');
  if v_student_ids is null then raise exception 'batch_not_found'; end if;

  -- Khóa học sinh (kể cả đã lưu trữ) trước khi đọc số dư và kiểm tra đã hoàn tác.
  perform 1 from (select s.id from public.students s
                   where s.id = any(v_student_ids) and s.class_id = v_class
                   order by s.id for no key update) l;

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
