-- Tổng sao cộng/trừ của lớp trong một khoảng, tính ngay trong SQL để không dính giới hạn 1000 dòng của PostgREST.
-- Dòng hoàn tác tính vào nhóm (cộng/trừ) của dòng gốc, giống sumWeekStars ở phía ứng dụng; mỗi nhóm không âm.

create function public.class_star_totals_between(p_from timestamptz, p_to timestamptz)
returns table (awarded int, penalized int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  return query
  select greatest(0, coalesce(sum(t.delta) filter (where b.bucket = 'award'), 0))::int,
         greatest(0, -coalesce(sum(t.delta) filter (where b.bucket = 'penalty'), 0))::int
    from public.star_transactions t
    left join public.star_transactions o
      on t.kind = 'reversal' and o.class_id = t.class_id and o.id = t.reverses_id
    cross join lateral (select (case when t.kind = 'reversal' then o.kind else t.kind end)::text as bucket) b
   where t.class_id = v_class
     and t.kind in ('award', 'penalty', 'reversal')
     and (p_from is null or t.created_at >= p_from)
     and (p_to is null or t.created_at < p_to);
end;
$$;

revoke execute on function public.class_star_totals_between(timestamptz, timestamptz) from public, anon;
grant execute on function public.class_star_totals_between(timestamptz, timestamptz) to authenticated;
