-- Accounts phase 3: shared links belong to the account that shared them and show its name.
-- Sharing with everyone now needs a login (Google). Run once in the SQL Editor after schema.sql and
-- accounts.sql; safe to re-run. Links shared before this keep working and can still be removed from the
-- browser that added them (its secret token is synced with your account).

alter table public.resources add column if not exists owner uuid references auth.users (id) on delete set null;
alter table public.resources add column if not exists author_name text
  check (author_name is null or char_length(author_name) <= 40);

grant select (owner, author_name) on public.resources to anon;

-- Share a link as yourself. The name shown is your profile name (or the one Google gave), copied once.
create or replace function public.share_resource(
  title text, url text, category text, type text, level text, tags text[], description text
) returns bigint
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  who uuid := auth.uid();
  who_name text;
  new_id bigint;
begin
  if who is null then
    raise exception 'Log in to share a link' using errcode = '28000';
  end if;
  select coalesce(p.display_name, u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
    into who_name
    from auth.users u left join public.profiles p on p.id = u.id
   where u.id = who;
  insert into public.resources (title, url, category, type, level, tags, description, owner, author_name)
  values (title, url, category, type, level, coalesce(tags, '{}'), description, who, left(who_name, 40))
  returning id into new_id;
  return new_id;
end $$;

-- Remove a link you shared, from any device you're logged in on.
create or replace function public.remove_my_resource(resource_id bigint) returns boolean
language sql security definer set search_path = '' as $$
  with gone as (delete from public.resources where id = resource_id and owner = auth.uid() returning 1)
  select exists (select 1 from gone);
$$;

revoke all on function public.share_resource(text, text, text, text, text, text[], text) from public, anon;
revoke all on function public.remove_my_resource(bigint) from public, anon;
grant execute on function public.share_resource(text, text, text, text, text, text[], text) to authenticated;
grant execute on function public.remove_my_resource(bigint) to authenticated;

-- Anonymous sharing is switched off: the old function stays only so nothing breaks mid-deploy.
revoke execute on function public.add_resource(text, text, text, text, text, text[], text, uuid) from anon;
