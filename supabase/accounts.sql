-- Accounts: a profile per user, created when they sign up, that only they can read or change, and a way for
-- them to delete their own account. Run once in the SQL Editor (already done for the `guitar-music` project).
-- Sign up, log in and passwords themselves are handled by Supabase Auth; see supabase/README.md.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Signed-in users see and edit only their own row. Visitors who aren't logged in get nothing.
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, created_at, updated_at) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.profiles_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- Make the profile when someone signs up, using the name they typed (if any). Never blocks a sign up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(btrim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'display_name', ''), '\s+', ' ', 'g')), 40), ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Delete your own account (the Account page's "Delete account"). The profile goes with it (on delete cascade).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
