-- Đợt 5, vòng sửa cuối: học sinh đã lưu trữ mất quyền API, cờ quà, hoàn tác nhiệm vụ, thu hồi huy hiệu.

-- 1) Học sinh đã lưu trữ (archived_at) không còn danh tính trong DB: mọi policy, view, RPC và storage
--    đều dựa vào hai hàm này nên đóng được một lần. Giáo viên (student_id null) không đổi.
create or replace function private.my_student_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.student_id
    from public.profiles p
    join public.students s on s.id = p.student_id
   where p.id = (select auth.uid()) and s.archived_at is null
$$;

create or replace function private.my_class_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.class_id
    from public.profiles p
    left join public.students s on s.id = p.student_id
   where p.id = (select auth.uid()) and (p.student_id is null or s.archived_at is null)
$$;

-- 2) Học sinh (không phải giáo viên) không nhận roll_no trong bảng xếp hạng; vẫn giữ student_id để đánh dấu "(em)".
create or replace function private.leaderboard_core(p_from timestamptz, p_to timestamptz)
returns table (student_id uuid, full_name text, avatar_id uuid, roll_no int, stars int, rank int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.full_name, s.avatar_id,
         case when private.is_teacher() then s.roll_no end,
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

-- 3) Quà và yêu cầu đổi quà của học sinh cũng theo cờ feature_rewards (như reward_availability / request_reward).
drop policy student_select on public.reward_requests;
create policy student_select on public.reward_requests for select to authenticated
  using (student_id = (select private.my_student_id())
         and (select private.setting_on('feature_rewards'))
         and (select private.setting_on('student_can_view_rewards')));

drop policy student_select on public.rewards;
create policy student_select on public.rewards for select to authenticated
  using (class_id = (select private.my_class_id()) and not hidden
         and (select private.setting_on('feature_rewards'))
         and (select private.setting_on('student_can_view_rewards')));

create or replace function public.my_reward_requests()
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
     and private.setting_on('feature_rewards')
     and rr.class_id = private.my_class_id()
     and rr.student_id = private.my_student_id()
   order by rr.created_at desc
$$;

-- 4) Hoàn tác batch của nhiệm vụ thì xóa luôn dòng hoàn thành (giữ chữ ký, quyền và phần còn lại của 0009).
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

  -- Batch do complete_mission tạo: bỏ dòng hoàn thành để ghi nhận lại được trong cùng kỳ.
  delete from public.mission_completions c
   where c.class_id = v_class
     and c.star_transaction_id in (select o.id from public.star_transactions o
                                    where o.class_id = v_class and o.batch_id = p_batch_id);

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'stars.reverse', 'star_batch', v_new,
          jsonb_build_object('reverses_batch_id', p_batch_id));
  return v_new;
end;
$$;

-- 5) Thu hồi huy hiệu đã trao nhầm. award_badge không cộng sao nên không có gì để hoàn.
create function public.revoke_badge(p_student_id uuid, p_badge_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  -- Khóa học sinh trước (kể cả đã lưu trữ), đúng thứ tự khóa chung.
  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class
   for no key update;
  if not found then raise exception 'student_not_found'; end if;

  delete from public.student_badges sb
   where sb.class_id = v_class and sb.student_id = p_student_id and sb.badge_id = p_badge_id;
  if not found then raise exception 'badge_not_awarded'; end if;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'badges.revoke', 'badge', p_badge_id,
          jsonb_build_object('student_id', p_student_id));
end;
$$;

revoke execute on function public.revoke_badge(uuid, uuid) from public, anon;
grant execute on function public.revoke_badge(uuid, uuid) to authenticated;
