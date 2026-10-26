-- Shared chord charts for the Charts page.
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again after changes.

-- A chart's sections are [{ "label": "A", "bars": ["Dm7 G7", "Cmaj7", ...] }, ...].
create or replace function public.chart_sections_ok(s jsonb) returns boolean
language sql immutable set search_path = public as $$
  select jsonb_typeof(s) = 'array'
    and jsonb_array_length(s) between 1 and 16
    and (select coalesce(sum(jsonb_array_length(sec -> 'bars')), 0) from jsonb_array_elements(s) sec where jsonb_typeof(sec -> 'bars') = 'array') <= 256
    and not exists (
      select 1 from jsonb_array_elements(s) sec
      where jsonb_typeof(sec) is distinct from 'object'
        or jsonb_typeof(sec -> 'label') is distinct from 'string'
        or char_length(sec ->> 'label') > 12
        or jsonb_typeof(sec -> 'bars') is distinct from 'array'
        or jsonb_array_length(sec -> 'bars') not between 1 and 64
        or exists (
          select 1 from jsonb_array_elements(sec -> 'bars') bar
          where jsonb_typeof(bar) is distinct from 'string' or char_length(bar #>> '{}') > 40
        )
    )
$$;

create table if not exists public.charts (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 80),
  composer text not null default '' check (char_length(composer) <= 60),
  style text not null default 'swing'
    check (style in ('swing', 'ballad', 'bossa', 'rock', 'pop', 'funk', 'shuffle', 'waltz', 'country')),
  key text not null default 'C' check (key ~ '^[A-G][b#]?m?$'),
  time_signature text not null default '4/4' check (time_signature in ('4/4', '3/4', '2/4', '5/4', '6/4')),
  tempo int not null default 120 check (tempo between 40 and 300),
  sections jsonb not null check (public.chart_sections_ok(sections)),
  -- New charts show straight away. To approve charts before they appear, run
  --   alter table public.charts alter column approved set default false;
  -- and tick "approved" in the Table Editor for the ones you want to keep.
  approved boolean not null default true,
  reports int not null default 0,
  -- Secret kept in the creator's browser so they can edit or remove their own chart. Never readable by visitors.
  owner_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.charts enable row level security;

-- Visitors (the public "anon" key) can only read approved charts directly. Adding, editing, removing
-- and reporting go through the functions below; anything else is done by you in the Supabase dashboard.
drop policy if exists "Anyone can read approved charts" on public.charts;
create policy "Anyone can read approved charts" on public.charts
  for select to anon using (approved);

revoke all on public.charts from anon, authenticated;
grant select (id, title, composer, style, key, time_signature, tempo, sections, approved, created_at, updated_at) on public.charts to anon;

-- Flood protection: refuse new charts once 20 have been added in the last 10 minutes.
create or replace function public.charts_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.charts where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many new charts, slow down';
  end if;
  return new;
end;
$$;

drop trigger if exists charts_rate_limit on public.charts;
create trigger charts_rate_limit before insert on public.charts
  for each row execute function public.charts_rate_limit();

-- Add a chart. The table's checks validate every field; returns the new id.
create or replace function public.add_chart(
  title text, composer text, style text, key text, time_signature text, tempo int, sections jsonb, token uuid
) returns bigint
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
declare
  new_id bigint;
begin
  insert into public.charts (title, composer, style, key, time_signature, tempo, sections, owner_token)
  values (title, coalesce(composer, ''), style, key, time_signature, tempo, sections, token)
  returning id into new_id;
  return new_id;
end;
$$;

-- Whoever added a chart (same browser) can change it.
create or replace function public.update_chart(
  chart_id bigint, token uuid, title text, composer text, style text, key text, time_signature text, tempo int, sections jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
begin
  update public.charts c
  set title = title, composer = coalesce(composer, ''), style = style, key = key, time_signature = time_signature, tempo = tempo,
      sections = sections, updated_at = now()
  where c.id = chart_id and c.owner_token = token;
  return found;
end;
$$;

-- Whoever added a chart (same browser) can remove it.
create or replace function public.remove_chart(chart_id bigint, token uuid) returns boolean
language sql security definer set search_path = public as $$
  with gone as (delete from public.charts where id = chart_id and owner_token = token returning 1)
  select exists (select 1 from gone);
$$;

-- Anyone can report a chart; after 3 reports it's hidden until you review it (set approved back to true
-- and reports to 0 in the Table Editor, or delete the row).
create table if not exists public.chart_reports (
  id bigint generated always as identity primary key,
  chart_id bigint not null references public.charts (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
alter table public.chart_reports enable row level security;
revoke all on public.chart_reports from anon, authenticated;

create or replace function public.report_chart(chart_id bigint, reason text default '') returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_variable
begin
  if (select count(*) from public.chart_reports where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many reports, slow down';
  end if;
  insert into public.chart_reports (chart_id, reason) values (chart_id, left(coalesce(reason, ''), 200));
  update public.charts set reports = reports + 1, approved = approved and reports + 1 < 3 where id = chart_id;
  return found;
end;
$$;

revoke all on function public.add_chart(text, text, text, text, text, int, jsonb, uuid) from public;
revoke all on function public.update_chart(bigint, uuid, text, text, text, text, text, int, jsonb) from public;
revoke all on function public.remove_chart(bigint, uuid) from public;
revoke all on function public.report_chart(bigint, text) from public;
revoke all on function public.charts_rate_limit() from public, anon, authenticated;
grant execute on function public.add_chart(text, text, text, text, text, int, jsonb, uuid) to anon;
grant execute on function public.update_chart(bigint, uuid, text, text, text, text, text, int, jsonb) to anon;
grant execute on function public.remove_chart(bigint, uuid) to anon;
grant execute on function public.report_chart(bigint, text) to anon;
