-- Gia cố sổ sao và dọn việc đợt 1.

alter table public.star_transactions add column batch_id uuid;
create index star_transactions_class_batch_idx on public.star_transactions (class_id, batch_id);

create function private.check_star_transaction() returns trigger
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
  return new;
end;
$$;

create trigger star_transactions_check
  before insert on public.star_transactions
  for each row execute function private.check_star_transaction();

alter table public.students add constraint students_class_code_key unique (class_id, code);

create unique index group_members_one_leader_idx on public.group_members (group_id) where role = 'leader';
create unique index group_members_one_deputy_idx on public.group_members (group_id) where role = 'deputy';

alter default privileges for role postgres in schema public revoke truncate on tables from anon, authenticated;

-- Mọi dòng thi đua (cộng, trừ, hoàn tác) phải thuộc một lượt (batch).
alter table public.star_transactions add constraint star_transactions_competition_batch_check
  check (kind not in ('award', 'penalty', 'reversal') or batch_id is not null);
