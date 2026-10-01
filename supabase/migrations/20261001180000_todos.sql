-- To-dos: each signed-in user's to-do list, synced like habits.
--
-- Last write wins on `updated_at` (epoch ms on the device). Deleting sets `deleted_at` instead of removing
-- the row, so other devices learn about the delete. `server_updated_at` is set by the database and only
-- used by devices to ask "what changed since I last looked".

create table public.todos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  due_date date,
  -- A time only makes sense with a day.
  due_time time check (due_time is null or due_date is not null),
  done_at bigint,
  deleted_at bigint,
  created_at bigint not null,
  updated_at bigint not null,
  server_updated_at timestamptz not null default now()
);
create index todos_user_changes on public.todos (user_id, server_updated_at);

-- Same last-write-wins rule as habits (public.keep_newest is defined in the sync migration).
create trigger todos_keep_newest before update on public.todos
  for each row execute function public.keep_newest();

-- Row-level security: people only ever see and change their own to-dos.
alter table public.todos enable row level security;

create policy "Own to-dos" on public.todos for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Grants (newer Supabase projects grant nothing by default). No hard deletes: deletes are tombstones.
revoke all on public.todos from anon, authenticated;
grant select, insert, update on public.todos to authenticated;
