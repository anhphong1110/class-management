-- Thống kê – Báo cáo: một lần gọi trả mọi khối số liệu của trang /bao-cao.
-- Ngày tính theo giờ Việt Nam, gồm cả hai đầu. Học sinh đã lưu trữ không tính.
-- Sao cộng/trừ, mốc và tiêu chí cùng dùng một CTE `tx`: bỏ các dòng đã bị hoàn tác (có dòng reversal trỏ tới qua
-- reverses_id), dù hoàn tác xảy ra sau kỳ. Riêng `improved`/`progress` tính sao thi đua như bảng xếp hạng
-- (award + penalty + reversal), nên dòng hoàn tác được tính vào ngày nó được tạo.

create function public.report_summary(p_from date, p_to date, p_bucket text) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_days int;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_prev_ts timestamptz;
  v_last int;
  v_present int;
  v_late int;
  v_excused int;
  v_unexcused int;
  v_total int;
  v_att jsonb;
  v_result jsonb;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  if p_from is null or p_to is null or p_bucket is null or p_bucket not in ('day', 'week', 'month')
     or p_from > p_to or p_to - p_from + 1 > 400 then
    raise exception 'invalid_range';
  end if;

  v_days := p_to - p_from + 1;
  v_from_ts := p_from::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_to_ts := (p_to + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_prev_ts := (p_from - v_days)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_last := case p_bucket
    when 'day' then p_to - p_from
    when 'week' then (p_to - p_from) / 7
    else (extract(year from p_to)::int * 12 + extract(month from p_to)::int)
       - (extract(year from p_from)::int * 12 + extract(month from p_from)::int)
  end;

  -- Điểm danh: tổng theo từng trạng thái (học sinh đang học).
  select count(*) filter (where a.status = 'present'),
         count(*) filter (where a.status = 'late'),
         count(*) filter (where a.status = 'absent_excused'),
         count(*) filter (where a.status = 'absent_unexcused'),
         count(*)
    into v_present, v_late, v_excused, v_unexcused, v_total
    from public.attendance a
    join public.students s on s.class_id = a.class_id and s.id = a.student_id and s.archived_at is null
   where a.class_id = v_class and a.date between p_from and p_to;

  -- Phần trăm theo phương pháp phần dư lớn nhất để tổng đúng 100; không có bản ghi thì tất cả 0.
  if v_total = 0 then
    v_att := jsonb_build_object('present', 0, 'late', 0, 'excused', 0, 'unexcused', 0);
  else
    select jsonb_object_agg(k, pct) into v_att from (
      select f.k, f.fl + (row_number() over (order by f.rm desc, f.ord) <= 100 - sum(f.fl) over ())::int as pct
        from (select c.k, c.ord, (c.n * 100) / v_total as fl, (c.n * 100) % v_total as rm
                from (values ('present', 1, v_present), ('late', 2, v_late),
                             ('excused', 3, v_excused), ('unexcused', 4, v_unexcused)) as c(k, ord, n)) f
    ) x;
  end if;

  with st as (
    select s.id, s.full_name, s.avatar_id, s.roll_no
      from public.students s where s.class_id = v_class and s.archived_at is null
  ),
  tx as (
    select t.student_id, t.kind, t.delta, t.criterion_id,
           case p_bucket
             when 'day' then (t.created_at at time zone 'Asia/Ho_Chi_Minh')::date - p_from
             when 'week' then ((t.created_at at time zone 'Asia/Ho_Chi_Minh')::date - p_from) / 7
             else (extract(year from t.created_at at time zone 'Asia/Ho_Chi_Minh')::int * 12
                   + extract(month from t.created_at at time zone 'Asia/Ho_Chi_Minh')::int)
                - (extract(year from p_from)::int * 12 + extract(month from p_from)::int)
           end as bi
      from public.star_transactions t
      join st on st.id = t.student_id
     where t.class_id = v_class and t.kind in ('award', 'penalty')
       and t.created_at >= v_from_ts and t.created_at < v_to_ts
       and not exists (select 1 from public.star_transactions r where r.class_id = t.class_id and r.reverses_id = t.id)
  ),
  series as (
    select i,
           case p_bucket
             -- Khoảng quá 7 ngày (chọn ngày) lặp lại thứ, nên thêm dd/mm cho khỏi nhầm.
             when 'day' then (array['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'])[extract(isodow from p_from + i)::int]
                             || case when v_days > 7 then ' ' || to_char(p_from + i, 'DD/MM') else '' end
             when 'week' then 'Tuần ' || (i + 1)
             else 'T' || extract(month from date_trunc('month', p_from) + make_interval(months => i))::int
           end as label
      from generate_series(0, v_last) i
  ),
  per as (
    select st.id, st.full_name, st.avatar_id, st.roll_no,
           coalesce(sum(t.delta) filter (where t.created_at >= v_from_ts), 0)::int as cur,
           coalesce(sum(t.delta) filter (where t.created_at < v_from_ts), 0)::int as prev
      from st
      left join public.star_transactions t
        on t.class_id = v_class and t.student_id = st.id and t.kind in ('award', 'penalty', 'reversal')
       and t.created_at >= v_prev_ts and t.created_at < v_to_ts
     group by st.id, st.full_name, st.avatar_id, st.roll_no
  ),
  absent as (
    select s.full_name, s.roll_no, count(*)::int as days
      from public.attendance a
      join st s on s.id = a.student_id
     where a.class_id = v_class and a.date between p_from and p_to
       and a.status in ('absent_excused', 'absent_unexcused')
     group by s.id, s.full_name, s.roll_no
  ),
  gift as (
    select r.name as label, count(*)::int as n
      from public.reward_requests rq
      join public.rewards r on r.class_id = rq.class_id and r.id = rq.reward_id
      join st on st.id = rq.student_id
     where rq.class_id = v_class and rq.status in ('approved', 'delivered')
       and rq.decided_at >= v_from_ts and rq.decided_at < v_to_ts
     group by r.id, r.name
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'added', (select coalesce(sum(delta) filter (where kind = 'award'), 0)::int from tx),
      'deducted', (select coalesce(-sum(delta) filter (where kind = 'penalty'), 0)::int from tx),
      'attendancePct', case when v_total = 0 then 0 else round((v_present + v_late) * 100.0 / v_total)::int end,
      'redeemed', (select coalesce(sum(n), 0)::int from gift),
      'improved', (select count(*)::int from per where cur > prev)),
    'buckets', (select jsonb_agg(jsonb_build_object(
        'label', sr.label,
        'added', coalesce((select sum(x.delta) from tx x where x.bi = sr.i and x.kind = 'award'), 0)::int,
        'deducted', coalesce((select -sum(x.delta) from tx x where x.bi = sr.i and x.kind = 'penalty'), 0)::int)
        order by sr.i) from series sr),
    'attendance', v_att,
    'lowAttendance', coalesce((select jsonb_agg(jsonb_build_object('name', q.full_name, 'days', q.days))
        from (select * from absent order by days desc, roll_no limit 3) q), '[]'::jsonb),
    'criteria', coalesce((select jsonb_agg(jsonb_build_object('label', q.label, 'kind', q.kind, 'n', q.n)
        order by q.n desc, q.label)
        from (select c.label, c.kind::text as kind, count(*)::int as n
                from tx join public.star_criteria c on c.class_id = v_class and c.id = tx.criterion_id
               group by c.id, c.label, c.kind) q), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(jsonb_build_object('studentId', q.id, 'name', q.full_name,
        'avatarId', q.avatar_id, 'up', q.up) order by q.up desc, q.roll_no)
        from (select id, full_name, avatar_id, roll_no, cur - prev as up from per
               where cur > prev order by cur - prev desc, roll_no limit 5) q), '[]'::jsonb),
    'gifts', coalesce((select jsonb_agg(jsonb_build_object('label', g.label, 'n', g.n) order by g.n desc, g.label)
        from gift g), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.report_summary(date, date, text) from public, anon;
grant execute on function public.report_summary(date, date, text) to authenticated;
