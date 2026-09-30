-- Sync: every signed-in user's habits, check-ins, focus sessions, settings and running timer.
--
-- Conflicts: habits, settings and the running timer are last-write-wins on `updated_at`, the time
-- (epoch ms) the change was made on the device. Check-ins and sessions are append-only and keyed by
-- a device-made UUID, so the same row sent twice is stored once. `server_*` columns are set by the
-- database and only used by devices to ask "what changed since I last looked".

create table public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('check', 'count', 'duration')),
  target integer not null check (target between 1 and 240),
  schedule jsonb not null check (jsonb_typeof(schedule) = 'object' and pg_column_size(schedule) < 1024),
  reminders jsonb not null default '[]' check (jsonb_typeof(reminders) = 'array' and jsonb_array_length(reminders) <= 3),
  created_on date not null,
  archived_at bigint,
  deleted_at bigint,
  updated_at bigint not null,
  server_updated_at timestamptz not null default now()
);
create index habits_user_changes on public.habits (user_id, server_updated_at);

create table public.habit_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  type text not null check (type in ('complete', 'undo')),
  value integer not null check (value between 0 and 1000),
  created_at bigint not null,
  server_inserted_at timestamptz not null default now()
);
create index habit_events_user_changes on public.habit_events (user_id, server_inserted_at);

create table public.focus_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  minutes integer not null check (minutes between 0 and 600),
  status text not null check (status in ('done', 'given_up')),
  tag text not null check (char_length(tag) <= 30),
  -- Not a foreign key: sessions stay on the island even after their habit is deleted.
  habit_id uuid,
  created_at bigint not null,
  server_inserted_at timestamptz not null default now()
);
create index focus_sessions_user_changes on public.focus_sessions (user_id, server_inserted_at);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 4096),
  updated_at bigint not null,
  server_updated_at timestamptz not null default now()
);

-- The running focus timer, so every device shows the same countdown. `data` is null when idle.
create table public.active_focus (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb check (data is null or (jsonb_typeof(data) = 'object' and pg_column_size(data) < 2048)),
  updated_at bigint not null,
  server_updated_at timestamptz not null default now()
);

-- Last-write-wins: an older change arriving late never overwrites a newer one.
create function public.keep_newest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  new.server_updated_at = now();
  return new;
end;
$$;

create trigger habits_keep_newest before update on public.habits
  for each row execute function public.keep_newest();
create trigger user_settings_keep_newest before update on public.user_settings
  for each row execute function public.keep_newest();
create trigger active_focus_keep_newest before update on public.active_focus
  for each row execute function public.keep_newest();

-- Deleting a habit (setting deleted_at) removes its check-ins everywhere.
create function public.drop_deleted_habit_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.habit_events where habit_id = new.id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger habits_drop_deleted_events after update on public.habits
  for each row execute function public.drop_deleted_habit_events();

-- Row-level security: people only ever see and change their own rows.
alter table public.habits enable row level security;
alter table public.habit_events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.user_settings enable row level security;
alter table public.active_focus enable row level security;

create policy "Own habits" on public.habits for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Read own check-ins" on public.habit_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Add check-ins to own habits" on public.habit_events for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );

create policy "Read own sessions" on public.focus_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Add own sessions" on public.focus_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Own settings" on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Own timer" on public.active_focus for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Grants (newer Supabase projects grant nothing by default). Check-ins and sessions are append-only.
revoke all on public.habits, public.habit_events, public.focus_sessions, public.user_settings, public.active_focus
  from anon, authenticated;
grant select, insert, update on public.habits to authenticated;
grant select, insert on public.habit_events to authenticated;
grant select, insert on public.focus_sessions to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update on public.active_focus to authenticated;

-- Account deletion from inside the app. Everything above cascades from auth.users.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Trigger helpers are not meant to be called through the API.
revoke all on function public.keep_newest() from public, anon, authenticated;
revoke all on function public.drop_deleted_habit_events() from public, anon, authenticated;
