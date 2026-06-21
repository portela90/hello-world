-- Profiles (one row per auth user)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- Teams
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Team membership with role
create table team_members (
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Tasks assigned within a team
create table tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  due_date date,
  started_at timestamptz,
  accumulated_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

-- Clock-in / clock-out records
create table attendance (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  notes text
);

-- Document metadata (files stored in Supabase Storage bucket "documents")
create table documents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table tasks enable row level security;
alter table attendance enable row level security;
alter table documents enable row level security;

create or replace function is_team_member(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function is_team_manager(p_team_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid() and role in ('admin', 'manager')
  );
$$;

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create policy "profiles_select_own_or_teammate" on profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from team_members tm1
    join team_members tm2 on tm1.team_id = tm2.team_id
    where tm1.user_id = auth.uid() and tm2.user_id = profiles.id
  )
);
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());

create policy "teams_select_member" on teams for select using (is_team_member(id));
create policy "teams_insert_authenticated" on teams for insert with check (auth.uid() is not null);

create policy "team_members_select_same_team" on team_members for select using (is_team_member(team_id));
create policy "team_members_insert_self_or_admin" on team_members for insert with check (
  user_id = auth.uid() or is_team_member(team_id)
);

create policy "tasks_select_member" on tasks for select using (is_team_member(team_id));
create policy "tasks_insert_manager" on tasks for insert with check (is_team_manager(team_id));
create policy "tasks_update_assignee_or_manager" on tasks for update using (
  assigned_to = auth.uid() or is_team_manager(team_id)
);
create policy "tasks_delete_manager" on tasks for delete using (is_team_manager(team_id));

create policy "attendance_select_member" on attendance for select using (is_team_member(team_id));
create policy "attendance_insert_self" on attendance for insert with check (user_id = auth.uid() and is_team_member(team_id));
create policy "attendance_update_self" on attendance for update using (user_id = auth.uid());

create policy "documents_select_member" on documents for select using (is_team_member(team_id));
create policy "documents_insert_member" on documents for insert with check (is_team_member(team_id));
create policy "documents_delete_member" on documents for delete using (is_team_member(team_id));
