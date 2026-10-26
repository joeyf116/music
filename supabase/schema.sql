-- Shared resources for the Resources page.
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again after changes.

create table if not exists public.resources (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  url text not null unique check (char_length(url) <= 500 and url ~* '^https?://'),
  category text not null default 'Shared links' check (char_length(category) between 1 and 40),
  type text not null default 'Other'
    check (type in ('Tab', 'Lesson', 'Video', 'Backing track', 'Tool', 'Article', 'PDF', 'Other')),
  level text not null default '' check (level in ('', 'Beginner', 'Intermediate', 'Advanced')),
  tags text[] not null default '{}'
    check (cardinality(tags) <= 8 and char_length(array_to_string(tags, ',')) <= 220),
  description text not null default '' check (char_length(description) <= 200),
  -- New links show straight away. To approve links before they appear, run
  --   alter table public.resources alter column approved set default false;
  -- and tick "approved" in the Table Editor for the ones you want to keep.
  approved boolean not null default true,
  reports int not null default 0,
  -- Secret kept in the adder's browser so they can remove their own link. Never readable by visitors.
  owner_token uuid,
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

-- Visitors (the public "anon" key) can only read approved links directly. Adding, removing and
-- reporting go through the functions below; anything else is done by you in the Supabase dashboard.
drop policy if exists "Anyone can read approved links" on public.resources;
create policy "Anyone can read approved links" on public.resources
  for select to anon using (approved);

revoke all on public.resources from anon;
grant select (id, title, url, category, type, level, tags, description, approved, created_at) on public.resources to anon;

-- Flood protection: refuse new links once 20 have been added in the last 10 minutes.
create or replace function public.resources_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.resources where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many new links, slow down';
  end if;
  return new;
end;
$$;

drop trigger if exists resources_rate_limit on public.resources;
create trigger resources_rate_limit before insert on public.resources
  for each row execute function public.resources_rate_limit();

-- Add a link. The table's checks validate every field; returns the new id.
create or replace function public.add_resource(
  title text, url text, category text, type text, level text, tags text[], description text, token uuid
) returns bigint
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare
  new_id bigint;
begin
  insert into public.resources (title, url, category, type, level, tags, description, owner_token)
  values (title, url, category, type, level, coalesce(tags, '{}'), description, token)
  returning id into new_id;
  return new_id;
end;
$$;

-- Whoever added a link (same browser) can remove it.
create or replace function public.remove_resource(resource_id bigint, token uuid) returns boolean
language sql security definer set search_path = public as $$
  with gone as (delete from public.resources where id = resource_id and owner_token = token returning 1)
  select exists (select 1 from gone);
$$;

-- Anyone can report a link; after 3 reports it's hidden until you review it (set approved back to true
-- and reports to 0 in the Table Editor, or delete the row).
create table if not exists public.resource_reports (
  id bigint generated always as identity primary key,
  resource_id bigint not null references public.resources (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
alter table public.resource_reports enable row level security;
revoke all on public.resource_reports from anon;

create or replace function public.report_resource(resource_id bigint, reason text default '') returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
begin
  if (select count(*) from public.resource_reports where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many reports, slow down';
  end if;
  insert into public.resource_reports (resource_id, reason) values (resource_id, left(coalesce(reason, ''), 200));
  update public.resources set reports = reports + 1, approved = approved and reports + 1 < 3 where id = resource_id;
  return found;
end;
$$;

revoke all on function public.add_resource(text, text, text, text, text, text[], text, uuid) from public;
revoke all on function public.remove_resource(bigint, uuid) from public;
revoke all on function public.report_resource(bigint, text) from public;
grant execute on function public.add_resource(text, text, text, text, text, text[], text, uuid) to anon;
grant execute on function public.remove_resource(bigint, uuid) to anon;
grant execute on function public.report_resource(bigint, text) to anon;
