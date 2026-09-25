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
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions add column if not exists user_agent text;
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();
create unique index if not exists push_subscriptions_endpoint_unique on public.push_subscriptions(endpoint);

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

create table if not exists public.classroom_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_account_id text not null,
  email text,
  name text,
  picture text,
  hosted_domain text,
  refresh_token_encrypted text not null,
  scope text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, google_account_id)
);

create index if not exists classroom_connections_user_id_idx on public.classroom_connections(user_id);

create table if not exists public.admin_access_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_edit boolean not null default false,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  actor_label text not null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  summary text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_access_grants_active_idx
  on public.admin_access_grants(expires_at)
  where revoked_at is null;
create index if not exists admin_audit_log_target_idx
  on public.admin_audit_log(target_user_id, created_at desc);

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
alter table public.classroom_connections enable row level security;
alter table public.admin_access_grants enable row level security;
alter table public.admin_audit_log enable row level security;

-- Classroom refresh tokens are server-only; no browser RLS policy is created for this table.

drop policy if exists "manage own admin grant" on public.admin_access_grants;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_access_grants' and policyname = 'read own admin grant'
  ) then
    create policy "read own admin grant"
      on public.admin_access_grants for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_audit_log' and policyname = 'read own admin audit'
  ) then
    create policy "read own admin audit"
      on public.admin_audit_log for select
      using (auth.uid() = target_user_id);
  end if;
end $$;

create or replace function public.set_admin_access_grant(
  p_user_id uuid,
  p_enabled boolean,
  p_can_edit boolean,
  p_expires_at timestamptz,
  p_summary text,
  p_changes jsonb default '{}'::jsonb
)
returns table(
  user_id uuid,
  can_edit boolean,
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  insert into public.admin_access_grants as existing_grant (
    user_id,
    can_edit,
    granted_at,
    expires_at,
    revoked_at,
    updated_at
  ) values (
    p_user_id,
    p_enabled and p_can_edit,
    v_now,
    case when p_enabled then p_expires_at else v_now end,
    case when p_enabled then null else v_now end,
    v_now
  )
  on conflict (user_id) do update
  set can_edit = excluded.can_edit,
      granted_at = case when p_enabled then v_now else existing_grant.granted_at end,
      expires_at = excluded.expires_at,
      revoked_at = excluded.revoked_at,
      updated_at = v_now;

  insert into public.admin_audit_log (
    actor_user_id,
    actor_label,
    target_user_id,
    action,
    summary,
    changes
  ) values (
    p_user_id,
    'Proprio usuario',
    p_user_id,
    case when p_enabled then 'access_granted' else 'access_revoked' end,
    p_summary,
    coalesce(p_changes, '{}'::jsonb)
  );

  return query
  select
    grant_row.user_id,
    grant_row.can_edit,
    grant_row.granted_at,
    grant_row.expires_at,
    grant_row.revoked_at,
    grant_row.updated_at
  from public.admin_access_grants as grant_row
  where grant_row.user_id = p_user_id;
end;
$$;

revoke all on function public.set_admin_access_grant(
  uuid, boolean, boolean, timestamptz, text, jsonb
) from public, anon, authenticated;
grant execute on function public.set_admin_access_grant(
  uuid, boolean, boolean, timestamptz, text, jsonb
) to service_role;

create or replace function public.apply_authorized_admin_routine_edit(
  p_actor_user_id uuid,
  p_actor_label text,
  p_target_user_id uuid,
  p_expected_updated_at timestamptz,
  p_next_data jsonb,
  p_action text,
  p_summary text,
  p_changes jsonb default '{}'::jsonb
)
returns table(data jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_data jsonb;
  v_updated_at timestamptz;
begin
  if not exists (
    select 1
    from public.admin_access_grants
    where user_id = p_target_user_id
      and can_edit = true
      and revoked_at is null
      and expires_at > now()
  ) then
    raise exception 'admin_edit_not_authorized' using errcode = '42501';
  end if;

  update public.routine_snapshots
  set data = p_next_data,
      updated_at = now()
  where user_id = p_target_user_id
    and updated_at = p_expected_updated_at
  returning routine_snapshots.data, routine_snapshots.updated_at
  into v_data, v_updated_at;

  if not found then
    raise exception 'routine_snapshot_changed' using errcode = '40001';
  end if;

  insert into public.admin_audit_log (
    actor_user_id,
    actor_label,
    target_user_id,
    action,
    summary,
    changes
  ) values (
    p_actor_user_id,
    p_actor_label,
    p_target_user_id,
    p_action,
    p_summary,
    coalesce(p_changes, '{}'::jsonb)
  );

  return query select v_data, v_updated_at;
end;
$$;

revoke all on function public.apply_authorized_admin_routine_edit(
  uuid, text, uuid, timestamptz, jsonb, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_authorized_admin_routine_edit(
  uuid, text, uuid, timestamptz, jsonb, text, text, jsonb
) to service_role;

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
