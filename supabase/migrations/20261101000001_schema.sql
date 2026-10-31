-- Lược đồ lõi: bảng, enum, ràng buộc, chỉ mục. RLS, hàm, view ở migration sau.

create type public.user_role as enum ('teacher', 'student');
create type public.group_role as enum ('leader', 'deputy', 'member');
create type public.criterion_kind as enum ('award', 'penalty');
create type public.star_kind as enum ('award', 'penalty', 'reserve', 'release', 'redeem', 'reversal');
create type public.reward_request_status as enum ('pending', 'approved', 'rejected', 'delivered');
create type public.attendance_status as enum ('present', 'absent_unexcused', 'absent_excused', 'late');
create type public.day_session as enum ('morning', 'afternoon');
create type public.mission_period as enum ('week', 'month');
create type public.avatar_kind as enum ('preset', 'upload');

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_name text not null default '',
  class_name text not null default '',
  school_year text not null default '',
  teacher_name text not null default '',
  slogan text not null default '',
  logo_path text,
  class_logo_path text,
  cover_path text,
  theme text not null default 'indigo' check (theme in ('indigo', 'pink', 'mint', 'gold')),
  term1_start date,
  term1_end date,
  term2_start date,
  term2_end date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.avatar_library (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  kind public.avatar_kind not null,
  preset jsonb,
  image_path text,
  label text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  code text not null,
  roll_no int not null,
  full_name text not null,
  avatar_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id),
  foreign key (class_id, avatar_id) references public.avatar_library (class_id, id) on delete set null (avatar_id)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  class_id uuid not null references public.classes on delete restrict,
  role public.user_role not null,
  username text not null unique,
  display_name text not null,
  avatar_id uuid,
  student_id uuid unique,
  created_at timestamptz not null default now(),
  foreign key (class_id, avatar_id) references public.avatar_library (class_id, id) on delete set null (avatar_id),
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  group_id uuid not null,
  student_id uuid not null,
  role public.group_role not null default 'member',
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, student_id),
  foreign key (class_id, group_id) references public.groups (class_id, id) on delete restrict,
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict
);

create table public.star_criteria (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  label text not null,
  kind public.criterion_kind not null,
  default_points int not null default 1 check (default_points > 0),
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  name text not null,
  cost int not null check (cost > 0),
  description text not null default '',
  image_path text,
  icon text,
  stock int not null default 0 check (stock >= 0),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.reward_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  student_id uuid not null,
  reward_id uuid not null,
  cost int not null check (cost > 0),
  status public.reward_request_status not null default 'pending',
  decided_by uuid references auth.users on delete set null,
  decided_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id),
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict,
  foreign key (class_id, reward_id) references public.rewards (class_id, id) on delete restrict
);

create table public.star_transactions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  student_id uuid not null,
  delta int not null check (delta <> 0),
  kind public.star_kind not null,
  criterion_id uuid,
  note text,
  reward_request_id uuid,
  reverses_id uuid unique,
  actor_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id),
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict,
  foreign key (class_id, criterion_id) references public.star_criteria (class_id, id) on delete restrict,
  foreign key (class_id, reward_request_id) references public.reward_requests (class_id, id) on delete restrict,
  foreign key (class_id, reverses_id) references public.star_transactions (class_id, id) on delete restrict,
  check ((kind in ('award', 'release') and delta > 0)
         or (kind in ('penalty', 'reserve', 'redeem') and delta < 0)
         or kind = 'reversal'),
  check ((kind = 'reversal') = (reverses_id is not null)),
  check ((kind in ('reserve', 'release', 'redeem')) = (reward_request_id is not null))
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  student_id uuid not null,
  date date not null,
  status public.attendance_status not null,
  note text,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (student_id, date),
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  name text not null,
  color text not null default '#6675E8',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  weekday int not null check (weekday between 1 and 6),
  session public.day_session not null,
  period int not null,
  subject_id uuid,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, weekday, session, period),
  foreign key (class_id, subject_id) references public.subjects (class_id, id) on delete set null (subject_id),
  check (
    (session = 'morning' and period between 1 and 5)
    or (session = 'afternoon' and period between 1 and 3)
  )
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  title text not null,
  type text not null default '',
  body text not null default '',
  image_path text,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  name text not null,
  period public.mission_period not null,
  condition text not null default '',
  reward_stars int not null default 0 check (reward_stars >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  mission_id uuid not null,
  student_id uuid not null,
  period_key text not null,
  star_transaction_id uuid,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (mission_id, student_id, period_key),
  foreign key (class_id, mission_id) references public.missions (class_id, id) on delete restrict,
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict,
  foreign key (class_id, star_transaction_id) references public.star_transactions (class_id, id) on delete set null (star_transaction_id)
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  name text not null,
  icon text not null default '',
  gradient text not null default '',
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (class_id, id)
);

create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete restrict,
  badge_id uuid not null,
  student_id uuid not null,
  awarded_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  is_demo boolean not null default false,
  unique (badge_id, student_id),
  foreign key (class_id, badge_id) references public.badges (class_id, id) on delete restrict,
  foreign key (class_id, student_id) references public.students (class_id, id) on delete restrict
);

create table public.class_settings (
  class_id uuid primary key references public.classes on delete restrict,
  require_approval boolean not null default true,
  reserve_on_request boolean not null default true,
  only_enough boolean not null default true,
  feature_missions boolean not null default true,
  feature_random boolean not null default true,
  feature_display boolean not null default true,
  feature_rewards boolean not null default true,
  student_can_view_profile boolean not null default true,
  student_can_view_history boolean not null default true,
  student_can_view_rank boolean not null default true,
  student_can_view_rewards boolean not null default true,
  student_can_view_timetable boolean not null default true,
  student_can_view_news boolean not null default true,
  student_can_view_attendance boolean not null default false,
  student_can_change_avatar boolean not null default true,
  weekly_redeem_limit int not null default 2,
  star_steps int[] not null default '{1,2,3,5,10}',
  created_at timestamptz not null default now(),
  is_demo boolean not null default false
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes on delete restrict,
  actor_id uuid references auth.users on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Chỉ mục cho khóa ngoại (khóa chính và unique đã có chỉ mục riêng)
create index on public.avatar_library (class_id);
create index on public.students (class_id);
create index on public.students (avatar_id);
create index on public.profiles (class_id);
create index on public.profiles (avatar_id);
create index on public.groups (class_id);
create index on public.group_members (group_id);
create index on public.group_members (student_id);
create index on public.star_criteria (class_id);
create index on public.rewards (class_id);
create index on public.reward_requests (class_id);
create index on public.reward_requests (student_id, created_at);
create index on public.reward_requests (reward_id);
create index on public.reward_requests (decided_by);
create index on public.star_transactions (class_id);
create index on public.star_transactions (student_id, created_at);
create index on public.star_transactions (criterion_id);
create index on public.star_transactions (reward_request_id);
create index on public.star_transactions (actor_id);
create index on public.attendance (class_id);
create index on public.subjects (class_id);
create index on public.timetable_slots (subject_id);
create index on public.announcements (class_id);
create index on public.missions (class_id);
create index on public.mission_completions (class_id);
create index on public.mission_completions (student_id);
create index on public.mission_completions (star_transaction_id);
create index on public.badges (class_id);
create index on public.student_badges (class_id);
create index on public.student_badges (student_id);
create index on public.student_badges (awarded_by);
create index on public.audit_logs (class_id);
create index on public.audit_logs (actor_id);
create index on public.audit_logs (entity, entity_id);
