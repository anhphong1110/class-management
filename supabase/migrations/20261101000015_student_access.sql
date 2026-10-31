-- Đóng lỗ quyền đọc của học sinh và thêm các hàm đọc dành cho học sinh.

-- 1) Storage (objects.name qualified: rewards also has a column called name): học sinh chỉ đọc file mà bảng nguồn (theo RLS của chính em) cho phép.
drop policy class_media_select on storage.objects;
create policy class_media_select on storage.objects for select to authenticated
  using (
    bucket_id = 'class-media'
    and (storage.foldername(name))[1] = (select private.my_class_id())::text
    and (
      (select private.is_teacher())
      or (storage.foldername(name))[2] in ('avatars', 'logo', 'cover')
      or ((storage.foldername(name))[2] = 'announcements'
          and exists (select 1 from public.announcements a where a.image_path = objects.name))
      or ((storage.foldername(name))[2] = 'rewards'
          and (select private.setting_on('feature_rewards'))
          and exists (select 1 from public.rewards r where r.image_path = objects.name and not r.hidden))
    )
  );

-- 2) Quà còn lại, tính cả yêu cầu đang giữ của bạn khác (học sinh không đọc được reward_requests của bạn).
create function public.reward_availability()
returns table (reward_id uuid, name text, cost int, description text, icon text, image_path text, left_count int)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.name, r.cost, r.description, r.icon, r.image_path,
         greatest(r.stock - (select count(*) from public.reward_requests rr
                              where rr.class_id = r.class_id and rr.reward_id = r.id
                                and rr.status = 'pending'), 0)::int
    from public.rewards r
   where r.class_id = private.my_class_id()
     and not r.hidden
     and (private.is_teacher()
          or (private.setting_on('feature_rewards') and private.setting_on('student_can_view_rewards')))
   order by r.cost, r.name
$$;

-- 3) Yêu cầu đổi quà của chính học sinh, lấy tên quà kể cả khi quà đã ẩn.
create function public.my_reward_requests()
returns table (id uuid, reward_name text, cost int, status public.reward_request_status, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select rr.id, r.name, rr.cost, rr.status, rr.created_at
    from public.reward_requests rr
    join public.rewards r on r.class_id = rr.class_id and r.id = rr.reward_id
   where private.my_student_id() is not null
     and rr.class_id = private.my_class_id()
     and rr.student_id = private.my_student_id()
   order by rr.created_at desc
$$;

-- 4) Bảng xếp hạng: lõi dùng chung; kiểm quyền ở hàm công khai.
create function private.leaderboard_core(p_from timestamptz, p_to timestamptz)
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
-- Chỉ các hàm security definer bên dưới gọi được (chủ sở hữu); không ai khác, kể cả authenticated.
revoke execute on function private.leaderboard_core(timestamptz, timestamptz) from public, anon, authenticated;

-- Giữ chữ ký và kết quả của 0009; khác: chỉ giáo viên (học sinh dùng leaderboard_for_period).
create or replace function public.leaderboard_between(p_from timestamptz, p_to timestamptz)
returns table (student_id uuid, full_name text, avatar_id uuid, roll_no int, stars int, rank int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  return query select * from private.leaderboard_core(p_from, p_to);
end;
$$;

-- Mốc kỳ tính trong SQL, khớp resolvePeriod/periodRange (lib/domain/period.ts), giờ Việt Nam.
create function public.leaderboard_for_period(p_period text)
returns table (student_id uuid, full_name text, avatar_id uuid, roll_no int, stars int, rank int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tz constant text := 'Asia/Ho_Chi_Minh';
  v_local timestamp := now() at time zone tz;
  v_from timestamptz;
  v_to timestamptz;
  c public.classes;
begin
  if p_period = 'week' then
    v_from := date_trunc('week', v_local) at time zone tz;
    v_to := (date_trunc('week', v_local) + interval '7 days') at time zone tz;
  elsif p_period = 'month' then
    v_from := date_trunc('month', v_local) at time zone tz;
    v_to := (date_trunc('month', v_local) + interval '1 month') at time zone tz;
  elsif p_period = 'term' then
    select * into c from public.classes where id = private.my_class_id();
    if c.term2_start is not null and c.term2_end is not null
       and now() >= (c.term2_start::timestamp at time zone tz) then
      v_from := c.term2_start::timestamp at time zone tz;
      v_to := (c.term2_end + 1)::timestamp at time zone tz;
    elsif c.term1_start is not null and c.term1_end is not null then
      v_from := c.term1_start::timestamp at time zone tz;
      v_to := (c.term1_end + 1)::timestamp at time zone tz;
    end if;
  elsif p_period = 'year' then
    null;
  else
    raise exception 'invalid_input';
  end if;
  return query select * from private.leaderboard_core(v_from, v_to);
end;
$$;

-- 5) Tóm tắt hồ sơ của học sinh đang đăng nhập.
create function public.my_profile_summary()
returns table (student_id uuid, full_name text, avatar_id uuid, competition_stars int, available_stars int,
               rank_year int, class_size int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.avatar_id,
         coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::int,
         coalesce(sum(t.delta), 0)::int,
         case when private.setting_on('student_can_view_rank') then
           (select x.rank from private.leaderboard_core(null, null) x where x.student_id = s.id)
         end,
         (select count(*)::int from public.students c where c.class_id = s.class_id and c.archived_at is null)
    from public.students s
    left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
   where s.id = private.my_student_id() and s.class_id = private.my_class_id()
   group by s.id, s.class_id, s.full_name, s.avatar_id
$$;

revoke execute on function public.leaderboard_between(timestamptz, timestamptz),
  public.reward_availability(), public.my_reward_requests(), public.leaderboard_for_period(text),
  public.my_profile_summary() from public, anon;
grant execute on function public.leaderboard_between(timestamptz, timestamptz),
  public.reward_availability(), public.my_reward_requests(), public.leaderboard_for_period(text),
  public.my_profile_summary() to authenticated;
