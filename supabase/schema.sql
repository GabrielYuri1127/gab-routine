-- Supabase blueprint for Gavium. Apply in Fase 2 after creating the free Supabase project.
-- Every table keeps user_id so Row Level Security can isolate personal data.

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  name text not null,
  code text,
  professor text,
  room text,
  semester text not null,
  workload_hours integer not null default 60,
  color text not null default '#0f9f7a',
  status text not null default 'active',
  observations text,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  minimum_attendance numeric not null default 75,
  direct_approval_grade numeric not null default 8,
  minimum_final_grade numeric not null default 5,
  grading_method text not null default 'simple',
  final_grade_formula text not null default 'ufam-mf',
  total_expected_classes integer not null default 60,
  classes_per_meeting integer not null default 2
);

create table if not exists public.subject_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  weekday text not null,
  start_time time not null,
  end_time time not null,
  classes_quantity integer not null default 2
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  date date not null,
  quantity integer not null default 1,
  status text not null default 'absence',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  score numeric not null,
  max_score numeric not null default 10,
  weight numeric,
  type text,
  date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.academic_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  due_date date not null,
  time time,
  type text not null default 'activity',
  status text not null default 'not_started',
  weight numeric,
  max_score numeric,
  description text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  category text,
  date date,
  time time,
  due_date date,
  estimated_minutes integer,
  completed_at timestamptz,
  snoozed_until timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  starts_at time,
  ends_at time,
  category text not null,
  source_id text
);

create table if not exists public.reminders (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  source_type text,
  source_id text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  quiet_hours_start time not null default '23:00',
  quiet_hours_end time not null default '07:00',
  daily_summary_time time not null default '07:00',
  tomorrow_planning_time time not null default '21:30'
);

create table if not exists public.notification_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending'
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic text not null,
  planned_minutes integer not null default 25,
  actual_minutes integer,
  date date not null,
  notes text
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'idea',
  due_date date,
  links text[],
  notes text
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  done boolean not null default false
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  frequency text not null default 'daily',
  target_per_week integer
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  completed boolean not null default true
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null
);

create table if not exists public.routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  title text not null,
  item_order integer not null default 0,
  default_time time
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.semesters enable row level security;
alter table public.routine_snapshots enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_rules enable row level security;
alter table public.subject_schedules enable row level security;
alter table public.attendance_records enable row level security;
alter table public.grades enable row level security;
alter table public.academic_activities enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.reminders enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_schedules enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.study_sessions enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.ai_usage enable row level security;

do $$
declare
  table_name text;
  user_owned_tables text[] := array[
    'semesters',
    'routine_snapshots',
    'subjects',
    'academic_rules',
    'subject_schedules',
    'attendance_records',
    'grades',
    'academic_activities',
    'tasks',
    'events',
    'reminders',
    'notification_preferences',
    'notification_schedules',
    'push_subscriptions',
    'study_sessions',
    'projects',
    'project_tasks',
    'habits',
    'habit_logs',
    'routines',
    'routine_items',
    'ai_usage'
  ];
begin
  foreach table_name in array user_owned_tables loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'own rows'
    ) then
      execute format(
        'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        table_name
      );
    end if;
  end loop;
end $$;
