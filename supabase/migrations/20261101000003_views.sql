-- View tính sao. Học sinh không có policy đọc star_transactions, nên cả ba view đều là definer-rights
-- (security_barrier, không đặt security_invoker) và tự lọc theo người gọi.

-- Nhãn tiêu chí chỉ cho tiêu chí cộng sao; tiêu chí trừ sao không bao giờ lộ ra cho học sinh.
create function private.award_criterion_label(p_class_id uuid, p_criterion_id uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select c.label from public.star_criteria c
   where c.class_id = p_class_id and c.id = p_criterion_id and c.kind = 'award'
$$;
revoke execute on function private.award_criterion_label(uuid, uuid) from public, anon;
grant execute on function private.award_criterion_label(uuid, uuid) to authenticated;

-- Cố ý definer-rights: học sinh thấy số sao của chính mình mà không cần quyền đọc sổ giao dịch.
-- Không phụ thuộc cờ student_can_view_history (trang chủ luôn hiện sao khả dụng).
create view public.v_student_stars with (security_barrier = true) as
select
  s.class_id,
  s.id as student_id,
  coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::int as competition_stars,
  coalesce(sum(t.delta), 0)::int as available_stars
from public.students s
left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
where (private.is_teacher() and s.class_id = private.my_class_id())
   or s.id = private.my_student_id()
group by s.class_id, s.id;

-- Cố ý là view quyền chủ sở hữu (definer-rights, không đặt security_invoker): học sinh không đọc được
-- students/star_transactions của bạn qua RLS, nhưng được thấy bạn cùng lớp ở đúng các cột công khai này.
-- security_barrier chặn điều kiện lọc của người gọi chạy trước điều kiện của view.
create view public.v_leaderboard_public with (security_barrier = true) as
select
  s.class_id,
  s.id as student_id,
  s.full_name,
  s.avatar_id,
  coalesce(sum(t.delta) filter (where t.kind in ('award', 'penalty', 'reversal')), 0)::int as competition_stars
from public.students s
left join public.star_transactions t on t.class_id = s.class_id and t.student_id = s.id
where s.class_id = private.my_class_id()
  and s.archived_at is null
  and (private.is_teacher() or private.setting_on('student_can_view_rank'))
group by s.class_id, s.id, s.full_name, s.avatar_id;

-- Cố ý definer-rights: học sinh không đọc được star_transactions trực tiếp (sẽ lộ note/criterion_id của
-- giao dịch trừ sao); view chỉ trả cột đã che nhãn, lọc theo học sinh gọi và cờ student_can_view_history.
create view public.v_my_star_history with (security_barrier = true) as
select
  t.id,
  t.student_id,
  t.delta,
  t.kind,
  case
    when t.kind = 'penalty' then 'Trừ sao'
    when t.kind = 'reversal' and o.kind = 'penalty' then 'Trừ sao'
    when t.kind in ('award', 'reversal') then
      coalesce(private.award_criterion_label(t.class_id, coalesce(o.criterion_id, t.criterion_id)),
               nullif(coalesce(o.note, t.note), ''), 'Cộng sao')
    when t.kind = 'reserve' then 'Giữ sao đổi quà'
    when t.kind = 'release' then 'Hoàn sao đã giữ'
    else 'Đổi quà'
  end as label,
  t.created_at
from public.star_transactions t
left join public.star_transactions o on o.class_id = t.class_id and o.id = t.reverses_id
where t.student_id = private.my_student_id()
  and private.setting_on('student_can_view_history');

revoke all on public.v_student_stars, public.v_leaderboard_public, public.v_my_star_history from anon, public;
grant select on public.v_student_stars, public.v_leaderboard_public, public.v_my_star_history to authenticated;
