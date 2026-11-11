-- Settings that follow your account: one row per user holding the app's saved practice settings as JSON
-- (src/lib/settingsSync.js). Only its owner can read or write it. Run once in the SQL Editor; safe to re-run.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 262144),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users read their own settings" on public.user_settings;
create policy "Users read their own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users add their own settings" on public.user_settings;
create policy "Users add their own settings" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users change their own settings" on public.user_settings;
create policy "Users change their own settings" on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.user_settings from anon, authenticated;
grant select, insert (user_id, data), update (user_id, data) on public.user_settings to authenticated;

-- The server's clock decides which save is newest, never the browser's.
create or replace function public.user_settings_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch before insert or update on public.user_settings
  for each row execute function public.user_settings_touch();
