-- Đổi quà: gửi, duyệt, từ chối, giao, đặt tồn kho, lưu trữ học sinh.
-- Thứ tự khóa (xem 20261101000008): students (FOR NO KEY UPDATE) -> rewards (FOR UPDATE) -> reward_requests (FOR UPDATE).
-- Số "đang giữ" của một món quà = số yêu cầu pending của nó; số còn đổi được = stock - đang giữ.

-- Dòng sổ đổi quà phải thuộc yêu cầu của đúng học sinh và cùng lớp.
create or replace function private.check_star_transaction() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  orig public.star_transactions;
  crit_kind public.criterion_kind;
begin
  -- reverses_id null: để CHECK (kind = 'reversal') = (reverses_id is not null) báo lỗi.
  if new.kind = 'reversal' and new.reverses_id is not null then
    select * into orig from public.star_transactions
      where class_id = new.class_id and id = new.reverses_id;
    if not found
       or orig.kind not in ('award', 'penalty')
       or orig.student_id <> new.student_id
       or new.delta <> -orig.delta then
      raise exception 'invalid_reversal';
    end if;
  end if;

  if new.criterion_id is not null then
    select kind into crit_kind from public.star_criteria
      where class_id = new.class_id and id = new.criterion_id;
    if new.kind::text is distinct from crit_kind::text
       or new.kind not in ('award', 'penalty') then
      raise exception 'criterion_mismatch';
    end if;
  end if;

  -- reward_request_id null: để CHECK báo lỗi.
  if new.kind in ('reserve', 'release', 'redeem') and new.reward_request_id is not null then
    if not exists (select 1 from public.reward_requests rr
                    where rr.class_id = new.class_id and rr.id = new.reward_request_id
                      and rr.student_id = new.student_id) then
      raise exception 'reward_mismatch';
    end if;
  end if;
  return new;
end;
$$;

-- Từ chối một yêu cầu pending. Người gọi đã giữ khóa students -> rewards -> reward_requests.
create function private.reject_request_locked(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reward_requests;
begin
  select * into r from public.reward_requests where id = p_request_id;
  if exists (select 1 from public.star_transactions t
              where t.class_id = r.class_id and t.reward_request_id = r.id and t.kind = 'reserve') then
    insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, actor_id)
    values (r.class_id, r.student_id, r.cost, 'release', r.id, (select auth.uid()));
  end if;
  update public.reward_requests
     set status = 'rejected', decided_by = (select auth.uid()), decided_at = now()
   where id = r.id;
end;
$$;
revoke execute on function private.reject_request_locked(uuid) from public, anon, authenticated;

-- Duyệt một yêu cầu pending. Người gọi đã giữ khóa students -> rewards -> reward_requests.
create function private.approve_request_locked(p_request_id uuid, p_decider uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reward_requests;
  v_stock int;
begin
  select * into r from public.reward_requests where id = p_request_id;
  select stock into v_stock from public.rewards where class_id = r.class_id and id = r.reward_id;
  if v_stock < 1 then raise exception 'out_of_stock'; end if;

  if exists (select 1 from public.star_transactions t
              where t.class_id = r.class_id and t.reward_request_id = r.id and t.kind = 'reserve') then
    insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, actor_id)
    values (r.class_id, r.student_id, r.cost, 'release', r.id, p_decider);
  elsif coalesce((select sum(t.delta) from public.star_transactions t
                   where t.class_id = r.class_id and t.student_id = r.student_id), 0) < r.cost then
    raise exception 'insufficient_stars';
  end if;
  insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, actor_id)
  values (r.class_id, r.student_id, -r.cost, 'redeem', r.id, p_decider);

  -- Đổi trạng thái trước khi giảm kho để trigger stock >= pending không chặn nhầm.
  update public.reward_requests
     set status = 'approved', decided_by = p_decider, decided_at = now()
   where id = r.id;
  update public.rewards set stock = stock - 1 where class_id = r.class_id and id = r.reward_id;
end;
$$;
revoke execute on function private.approve_request_locked(uuid, uuid) from public, anon, authenticated;

create function public.request_reward(p_reward_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid := private.my_student_id();
  v_reward public.rewards;
  v_cfg public.class_settings;
  v_pending int;
  v_week_start timestamptz;
  v_used int;
  v_id uuid;
begin
  if v_student is null then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  select * into v_cfg from public.class_settings where class_id = v_class;
  if not found or not v_cfg.feature_rewards or not v_cfg.student_can_view_rewards then
    raise exception 'not_allowed';
  end if;

  -- 1) học sinh
  perform 1 from public.students s
   where s.id = v_student and s.class_id = v_class and s.archived_at is null for no key update;
  if not found then raise exception 'not_allowed'; end if;

  -- 2) quà
  select * into v_reward from public.rewards r
   where r.id = p_reward_id and r.class_id = v_class and not r.hidden for update;
  if not found then raise exception 'reward_not_found'; end if;

  select count(*) into v_pending from public.reward_requests rr
   where rr.class_id = v_class and rr.reward_id = v_reward.id and rr.status = 'pending';
  if v_reward.stock - v_pending < 1 then raise exception 'out_of_stock'; end if;

  -- Tuần bắt đầu thứ Hai 00:00 giờ Việt Nam.
  v_week_start := date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
  select count(*) into v_used from public.reward_requests rr
   where rr.class_id = v_class and rr.student_id = v_student
     and rr.created_at >= v_week_start and rr.status <> 'rejected';
  if v_used >= v_cfg.weekly_redeem_limit then raise exception 'weekly_limit'; end if;

  -- Giữ sao (reserve) không bao giờ được làm số dư âm, kể cả khi only_enough tắt.
  if (v_cfg.only_enough or v_cfg.reserve_on_request) and coalesce((select sum(t.delta) from public.star_transactions t
                                      where t.class_id = v_class and t.student_id = v_student), 0) < v_reward.cost then
    raise exception 'insufficient_stars';
  end if;

  insert into public.reward_requests (class_id, student_id, reward_id, cost)
  values (v_class, v_student, v_reward.id, v_reward.cost) returning id into v_id;
  if v_cfg.reserve_on_request then
    insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, actor_id)
    values (v_class, v_student, -v_reward.cost, 'reserve', v_id, (select auth.uid()));
  end if;
  if not v_cfg.require_approval then
    -- Học sinh không tự duyệt quà của mình: decided_by để null (audit ghi auto_approved).
    perform private.approve_request_locked(v_id, null);
  end if;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.request', 'reward_request', v_id,
          jsonb_build_object('reward_id', v_reward.id, 'student_id', v_student, 'cost', v_reward.cost,
                             'auto_approved', not v_cfg.require_approval));
  return v_id;
end;
$$;

create function public.approve_reward_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid;
  v_reward uuid;
  v_status public.reward_request_status;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select rr.student_id, rr.reward_id into v_student, v_reward from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class;
  if not found then raise exception 'not_allowed'; end if;

  perform 1 from public.students s where s.id = v_student and s.class_id = v_class for no key update;
  perform 1 from public.rewards r where r.id = v_reward and r.class_id = v_class for update;
  select rr.status into v_status from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class for update;
  if v_status <> 'pending' then raise exception 'already_processed'; end if;

  perform private.approve_request_locked(p_request_id, (select auth.uid()));

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.approve', 'reward_request', p_request_id,
          jsonb_build_object('reward_id', v_reward, 'student_id', v_student));
end;
$$;

create function public.reject_reward_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid;
  v_reward uuid;
  v_status public.reward_request_status;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select rr.student_id, rr.reward_id into v_student, v_reward from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class;
  if not found then raise exception 'not_allowed'; end if;

  perform 1 from public.students s where s.id = v_student and s.class_id = v_class for no key update;
  perform 1 from public.rewards r where r.id = v_reward and r.class_id = v_class for update;
  select rr.status into v_status from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class for update;
  if v_status <> 'pending' then raise exception 'already_processed'; end if;

  perform private.reject_request_locked(p_request_id);

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.reject', 'reward_request', p_request_id,
          jsonb_build_object('reward_id', v_reward, 'student_id', v_student));
end;
$$;

create function public.deliver_reward_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_status public.reward_request_status;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select rr.status into v_status from public.reward_requests rr
   where rr.id = p_request_id and rr.class_id = v_class for update;
  if not found then raise exception 'not_allowed'; end if;
  if v_status <> 'approved' then raise exception 'already_processed'; end if;

  update public.reward_requests set status = 'delivered', delivered_at = now() where id = p_request_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id)
  values (v_class, (select auth.uid()), 'rewards.deliver', 'reward_request', p_request_id);
end;
$$;

create function public.set_reward_stock(p_reward_id uuid, p_stock int) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_old int;
  v_pending int;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  select r.stock into v_old from public.rewards r
   where r.id = p_reward_id and r.class_id = v_class for update;
  if not found then raise exception 'reward_not_found'; end if;

  select count(*) into v_pending from public.reward_requests rr
   where rr.class_id = v_class and rr.reward_id = p_reward_id and rr.status = 'pending';
  if p_stock is null or p_stock < 0 or p_stock < v_pending then raise exception 'stock_below_held'; end if;

  update public.rewards set stock = p_stock where id = p_reward_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.stock', 'reward', p_reward_id,
          jsonb_build_object('from', v_old, 'to', p_stock));
end;
$$;

create function public.archive_student(p_student_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  r record;
  v_rejected int := 0;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class and s.archived_at is null for no key update;
  if not found then raise exception 'student_not_found'; end if;

  -- Đã giữ khóa học sinh; không yêu cầu mới nào của em chen vào được.
  -- Khóa mọi quà liên quan (theo id) trước, rồi mới khóa các yêu cầu (theo id).
  perform 1 from public.rewards w
   where w.class_id = v_class and w.id in (
     select rr.reward_id from public.reward_requests rr
      where rr.class_id = v_class and rr.student_id = p_student_id and rr.status = 'pending')
   order by w.id for update;
  for r in select rr.id from public.reward_requests rr
            where rr.class_id = v_class and rr.student_id = p_student_id and rr.status = 'pending'
            order by rr.id for update
  loop
    perform private.reject_request_locked(r.id);
    v_rejected := v_rejected + 1;
  end loop;

  delete from public.group_members where class_id = v_class and student_id = p_student_id;
  update public.students set archived_at = now() where id = p_student_id;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'students.archive', 'student', p_student_id,
          jsonb_build_object('rejected_requests', v_rejected));
end;
$$;

revoke execute on function public.request_reward(uuid) from public, anon;
revoke execute on function public.approve_reward_request(uuid) from public, anon;
revoke execute on function public.reject_reward_request(uuid) from public, anon;
revoke execute on function public.deliver_reward_request(uuid) from public, anon;
revoke execute on function public.set_reward_stock(uuid, int) from public, anon;
revoke execute on function public.archive_student(uuid) from public, anon;
grant execute on function public.request_reward(uuid) to authenticated;
grant execute on function public.approve_reward_request(uuid) to authenticated;
grant execute on function public.reject_reward_request(uuid) to authenticated;
grant execute on function public.deliver_reward_request(uuid) to authenticated;
grant execute on function public.set_reward_stock(uuid, int) to authenticated;
grant execute on function public.archive_student(uuid) to authenticated;

-- Bất biến: stock không âm và không nhỏ hơn số yêu cầu pending, kể cả khi UPDATE trực tiếp.
create function private.check_reward_stock() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stock < 0 or new.stock < (select count(*) from public.reward_requests rr
                                    where rr.class_id = new.class_id and rr.reward_id = new.id
                                      and rr.status = 'pending') then
    raise exception 'stock_below_held';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_reward_stock() from public, anon, authenticated;

create trigger rewards_stock_check
  before update of stock on public.rewards
  for each row execute function private.check_reward_stock();
