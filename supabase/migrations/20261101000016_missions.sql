-- Nhiệm vụ và huy hiệu: thêm kỳ "day" và "term", khóa kỳ, hai hàm ghi nhận cho giáo viên.
-- Thứ tự khóa: học sinh (FOR NO KEY UPDATE) trước, rồi mới đọc nhiệm vụ/huy hiệu (xem 20261101000008).

alter type public.mission_period add value if not exists 'day';
alter type public.mission_period add value if not exists 'term';

-- Khóa kỳ theo giờ Việt Nam, khớp missionPeriodKey (lib/missions/period.ts):
--   day   YYYY-MM-DD           week  YYYY-Www (tuần ISO, bắt đầu thứ Hai)
--   month YYYY-MM              term  T1/T2-<năm bắt đầu>-<năm kết thúc>; học kỳ 2 từ 0h ngày term2_start
-- Mốc học kỳ giống leaderboard_for_period (20261101000015); chưa nhập ngày thì tính là học kỳ 1.
-- Năm học: năm của term1_start, nếu chưa có thì tính từ tháng 8.
-- Dùng plpgsql và so sánh dạng chữ vì giá trị enum mới chưa dùng được trong cùng giao dịch với ALTER TYPE.
create function private.mission_period_key(p_period public.mission_period, p_at timestamptz, p_class uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tz constant text := 'Asia/Ho_Chi_Minh';
  v_local timestamp := p_at at time zone tz;
  c public.classes;
  v_start int;
  v_term int := 1;
begin
  case p_period::text
    when 'day' then
      return to_char(v_local, 'YYYY-MM-DD');
    when 'week' then
      return to_char(v_local, 'IYYY-"W"IW');
    when 'month' then
      return to_char(v_local, 'YYYY-MM');
    when 'term' then
      select * into c from public.classes where id = p_class;
      if c.term2_start is not null and c.term2_end is not null
         and p_at >= (c.term2_start::timestamp at time zone tz) then
        v_term := 2;
      end if;
      v_start := coalesce(extract(year from c.term1_start)::int,
                          extract(year from v_local)::int - case when extract(month from v_local) >= 8 then 0 else 1 end);
      return 'T' || v_term || '-' || v_start || '-' || (v_start + 1);
    else
      raise exception 'invalid_input';
  end case;
end;
$$;
revoke execute on function private.mission_period_key(public.mission_period, timestamptz, uuid) from public, anon, authenticated;

-- Học sinh chỉ đọc nhiệm vụ đang chạy, hoàn thành nhiệm vụ và huy hiệu của mình khi tính năng đang bật.
create policy student_select on public.missions for select to authenticated
  using (class_id = (select private.my_class_id()) and active and (select private.setting_on('feature_missions')));

create policy student_select on public.mission_completions for select to authenticated
  using (student_id = (select private.my_student_id()) and (select private.setting_on('feature_missions')));

drop policy student_select on public.badges;
create policy student_select on public.badges for select to authenticated
  using (class_id = (select private.my_class_id()) and (select private.setting_on('feature_missions')));

drop policy student_select on public.student_badges;
create policy student_select on public.student_badges for select to authenticated
  using (student_id = (select private.my_student_id()) and (select private.setting_on('feature_missions')));

-- Hoàn thành nhiệm vụ và huy hiệu đã trao chỉ ghi qua complete_mission / award_badge.
drop policy teacher_insert on public.mission_completions;
drop policy teacher_update on public.mission_completions;
drop policy teacher_insert on public.student_badges;
drop policy teacher_update on public.student_badges;

create function public.complete_mission(p_mission_id uuid, p_student_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_mission public.missions;
  v_key text;
  v_batch uuid;
  v_tx uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class and s.archived_at is null
   for no key update;
  if not found then raise exception 'student_not_found'; end if;

  select * into v_mission from public.missions m where m.id = p_mission_id and m.class_id = v_class;
  if not found then raise exception 'mission_not_found'; end if;
  if not v_mission.active then raise exception 'not_allowed'; end if;

  v_key := private.mission_period_key(v_mission.period, now(), v_class);
  if exists (select 1 from public.mission_completions c
              where c.mission_id = v_mission.id and c.student_id = p_student_id and c.period_key = v_key) then
    raise exception 'already_completed';
  end if;

  if v_mission.reward_stars > 0 then
    v_batch := private.change_stars('award', array[p_student_id], v_mission.reward_stars, null,
                                    'Nhiệm vụ: ' || v_mission.name);
    select t.id into v_tx from public.star_transactions t
     where t.class_id = v_class and t.batch_id = v_batch and t.student_id = p_student_id;
  end if;

  insert into public.mission_completions (class_id, mission_id, student_id, period_key, star_transaction_id)
  values (v_class, v_mission.id, p_student_id, v_key, v_tx);

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'missions.complete', 'mission', v_mission.id,
          jsonb_build_object('student_id', p_student_id, 'period_key', v_key, 'stars', v_mission.reward_stars));
end;
$$;

create function public.award_badge(p_badge_id uuid, p_student_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
begin
  if not private.is_teacher() then raise exception 'not_allowed'; end if;
  v_class := private.my_class_id();

  perform 1 from public.students s
   where s.id = p_student_id and s.class_id = v_class and s.archived_at is null
   for no key update;
  if not found then raise exception 'student_not_found'; end if;

  if not exists (select 1 from public.badges b where b.id = p_badge_id and b.class_id = v_class) then
    raise exception 'badge_not_found';
  end if;
  if exists (select 1 from public.student_badges sb where sb.badge_id = p_badge_id and sb.student_id = p_student_id) then
    raise exception 'already_awarded';
  end if;

  insert into public.student_badges (class_id, badge_id, student_id, awarded_by)
  values (v_class, p_badge_id, p_student_id, (select auth.uid()));

  insert into public.audit_logs (class_id, actor_id, action, entity, entity_id, payload)
  values (v_class, (select auth.uid()), 'badges.award', 'badge', p_badge_id,
          jsonb_build_object('student_id', p_student_id));
end;
$$;

revoke execute on function public.complete_mission(uuid, uuid), public.award_badge(uuid, uuid) from public, anon;
grant execute on function public.complete_mission(uuid, uuid), public.award_badge(uuid, uuid) to authenticated;
