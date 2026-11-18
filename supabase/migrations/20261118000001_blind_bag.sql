-- Túi mù: học sinh trả một giá cố định (trung bình giá các món trong túi), nhận ngẫu nhiên một món.
-- Xác suất của món i tỉ lệ với 1/cost nên món càng nhiều sao càng khó ra.

alter table public.class_settings add column feature_blind_bag boolean not null default false;
alter table public.reward_requests add column from_blind_bag boolean not null default false;

-- Quà cô cho vào túi: cờ trên chính món quà nên sao lưu và năm học mới mang theo mà không cần bảng riêng.
alter table public.rewards add column in_blind_bag boolean not null default false;

-- Cô đặt lại toàn bộ danh sách quà trong túi.
create function public.set_blind_bag_items(p_reward_ids uuid[]) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
  v_ids uuid[] := coalesce(p_reward_ids, '{}');
  v_ok int;
begin
  if not private.is_teacher() or v_class is null then raise exception 'not_allowed'; end if;
  select count(*) into v_ok from public.rewards r
   where r.class_id = v_class and r.id = any (v_ids);
  if v_ok <> (select count(distinct x) from unnest(v_ids) x) then raise exception 'reward_not_found'; end if;

  update public.rewards r set in_blind_bag = (r.id = any (v_ids))
   where r.class_id = v_class and r.in_blind_bag is distinct from (r.id = any (v_ids));

  insert into public.audit_logs (class_id, actor_id, action, entity, payload)
  values (v_class, (select auth.uid()), 'rewards.blind_bag_items', 'blind_bag',
          jsonb_build_object('reward_ids', to_jsonb(v_ids)));
end;
$$;

-- Thông tin túi cho học sinh (và cô xem thử): bật/tắt, giá, các món có thể ra. Không có tỉ lệ.
create function public.blind_bag_info() returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
  v_on boolean;
  v_price int;
  v_n int;
  v_items jsonb;
begin
  if v_class is null then return jsonb_build_object('enabled', false, 'price', 0, 'items', '[]'::jsonb); end if;
  v_on := private.setting_on('feature_blind_bag') and private.setting_on('feature_rewards')
          and (private.is_teacher() or private.setting_on('student_can_view_rewards'));
  if not v_on then return jsonb_build_object('enabled', false, 'price', 0, 'items', '[]'::jsonb); end if;

  with pool as (
    select r.id, r.name, r.icon, r.image_path, r.cost
      from public.rewards r
     where r.class_id = v_class and r.in_blind_bag and not r.hidden
       and r.stock - (select count(*) from public.reward_requests rr
                       where rr.class_id = r.class_id and rr.reward_id = r.id and rr.status = 'pending') >= 1
  )
  select count(*)::int, greatest(round(avg(cost))::int, 1),
         coalesce(jsonb_agg(jsonb_build_object('name', name, 'icon', icon, 'image_path', image_path) order by cost, name), '[]'::jsonb)
    into v_n, v_price, v_items
    from pool;

  return jsonb_build_object('enabled', v_n >= 2, 'price', coalesce(v_price, 0), 'items', v_items);
end;
$$;

-- Mở túi: chọn ngẫu nhiên có trọng số 1/cost, đóng băng giá túi vào yêu cầu rồi đi tiếp như request_reward.
create function public.open_blind_bag()
returns table (request_id uuid, picked_reward_id uuid, auto_approved boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_student uuid := private.my_student_id();
  v_cfg public.class_settings;
  v_ids uuid[];
  v_costs int[];
  v_price int;
  v_week_start timestamptz;
  v_used int;
  v_total numeric;
  v_x numeric;
  v_acc numeric := 0;
  v_pick uuid;
  v_id uuid;
  i int;
begin
  if v_student is null then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();
  select * into v_cfg from public.class_settings where class_id = v_class;
  if not found or not v_cfg.feature_rewards or not v_cfg.student_can_view_rewards or not v_cfg.feature_blind_bag then
    raise exception 'not_allowed';
  end if;

  -- 1) học sinh
  perform 1 from public.students s
   where s.id = v_student and s.class_id = v_class and s.archived_at is null for no key update;
  if not found then raise exception 'not_allowed'; end if;

  -- 2) quà trong túi, khóa theo id để không deadlock với các lần mở túi khác
  perform 1 from public.rewards r
   where r.class_id = v_class and r.in_blind_bag and not r.hidden
   order by r.id
     for update;

  select array_agg(x.id order by x.id), array_agg(x.cost order by x.id)
    into v_ids, v_costs
    from (
      select r.id, r.cost
        from public.rewards r
       where r.class_id = v_class and r.in_blind_bag and not r.hidden
         and r.stock - (select count(*) from public.reward_requests rr
                         where rr.class_id = r.class_id and rr.reward_id = r.id and rr.status = 'pending') >= 1
    ) x;
  if coalesce(array_length(v_ids, 1), 0) < 2 then raise exception 'blind_bag_unavailable'; end if;

  select greatest(round(avg(c))::int, 1) into v_price from unnest(v_costs) c;

  v_week_start := date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
  select count(*) into v_used from public.reward_requests rr
   where rr.class_id = v_class and rr.student_id = v_student
     and rr.created_at >= v_week_start and rr.status <> 'rejected';
  if v_used >= v_cfg.weekly_redeem_limit then raise exception 'weekly_limit'; end if;

  if (v_cfg.only_enough or v_cfg.reserve_on_request) and coalesce((select sum(t.delta) from public.star_transactions t
                                      where t.class_id = v_class and t.student_id = v_student), 0) < v_price then
    raise exception 'insufficient_stars';
  end if;

  -- 3) bốc thăm: trọng số 1/cost
  select sum(1.0 / c) into v_total from unnest(v_costs) c;
  v_x := random() * v_total;
  for i in 1 .. array_length(v_ids, 1) loop
    v_acc := v_acc + 1.0 / v_costs[i];
    v_pick := v_ids[i];
    exit when v_x < v_acc;
  end loop;

  insert into public.reward_requests (class_id, student_id, reward_id, cost, from_blind_bag)
  values (v_class, v_student, v_pick, v_price, true) returning id into v_id;
  if v_cfg.reserve_on_request then
    insert into public.star_transactions (class_id, student_id, delta, kind, reward_request_id, actor_id)
    values (v_class, v_student, -v_price, 'reserve', v_id, (select auth.uid()));
  end if;
  if not v_cfg.require_approval then
    perform private.approve_request_locked(v_id, null);
  end if;

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'rewards.blind_bag', 'reward_request', v_id,
          jsonb_build_object('reward_id', v_pick, 'student_id', v_student, 'price', v_price,
                             'auto_approved', not v_cfg.require_approval));
  return query select v_id, v_pick, not v_cfg.require_approval;
end;
$$;

-- Thêm cờ from_blind_bag vào danh sách yêu cầu của em (đổi kiểu trả về nên phải drop rồi tạo lại).
drop function public.my_reward_requests();
create function public.my_reward_requests()
returns table (id uuid, reward_name text, cost int, status public.reward_request_status, created_at timestamptz, from_blind_bag boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select rr.id, r.name, rr.cost, rr.status, rr.created_at, rr.from_blind_bag
    from public.reward_requests rr
    join public.rewards r on r.class_id = rr.class_id and r.id = rr.reward_id
   where private.my_student_id() is not null
     and private.setting_on('feature_rewards')
     and rr.class_id = private.my_class_id()
     and rr.student_id = private.my_student_id()
   order by rr.created_at desc
$$;

revoke execute on function public.set_blind_bag_items(uuid[]), public.blind_bag_info(),
  public.open_blind_bag(), public.my_reward_requests() from public, anon;
grant execute on function public.set_blind_bag_items(uuid[]), public.blind_bag_info(),
  public.open_blind_bag(), public.my_reward_requests() to authenticated;

-- Bật/tắt túi mù. Riêng một hàm vì save_class_settings chỉ nhận danh sách cờ cố định của trang Cài đặt.
create function public.set_blind_bag_enabled(p_on boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid := private.my_class_id();
begin
  if not private.is_teacher() or v_class is null then raise exception 'not_allowed'; end if;
  if p_on is null then raise exception 'invalid_input'; end if;
  update public.class_settings set feature_blind_bag = p_on where class_id = v_class;
  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'class.settings', 'class_settings', v_class,
          jsonb_build_object('feature_blind_bag', p_on));
end;
$$;
revoke execute on function public.set_blind_bag_enabled(boolean) from public, anon;
grant execute on function public.set_blind_bag_enabled(boolean) to authenticated;
