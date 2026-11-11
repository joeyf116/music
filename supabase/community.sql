-- Community board (#community): signed-in people post what they're working on or need help with, and reply
-- to each other. Anyone can read. Run once in the SQL Editor after accounts.sql; safe to re-run.
--
-- One table holds both posts and replies: a reply has a parent_id (one level only, no replies to replies).
-- The author and their name are filled in by the database, never taken from the browser.

create table if not exists public.board_posts (
  id bigint generated always as identity primary key,
  parent_id bigint references public.board_posts (id) on delete cascade,
  author uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null default 'Guitarist' check (char_length(author_name) between 1 and 40),
  -- Posts say what they are; replies don't.
  kind text check (kind in ('working', 'help')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  reports int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint board_posts_kind check ((parent_id is null) = (kind is not null))
);

create index if not exists board_posts_feed on public.board_posts (created_at desc) where parent_id is null;
create index if not exists board_posts_replies on public.board_posts (parent_id, created_at) where parent_id is not null;
create index if not exists board_posts_author on public.board_posts (author);

alter table public.board_posts enable row level security;

drop policy if exists "Anyone can read the board" on public.board_posts;
create policy "Anyone can read the board" on public.board_posts
  for select to anon, authenticated using (not hidden);

drop policy if exists "Members post as themselves" on public.board_posts;
create policy "Members post as themselves" on public.board_posts
  for insert to authenticated with check ((select auth.uid()) = author);

drop policy if exists "Members delete their own posts" on public.board_posts;
create policy "Members delete their own posts" on public.board_posts
  for delete to authenticated using ((select auth.uid()) = author);

revoke all on public.board_posts from anon, authenticated;
grant select (id, parent_id, author, author_name, kind, body, created_at) on public.board_posts to anon, authenticated;
grant insert (parent_id, kind, body) on public.board_posts to authenticated;
grant delete on public.board_posts to authenticated;

-- Before each new post or reply: stamp who wrote it and their name (profile name, then Google name), refuse
-- replies to replies or to hidden posts, and slow down floods (10 per person per 10 minutes).
create or replace function public.board_posts_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  parent public.board_posts%rowtype;
begin
  if uid is null then
    raise exception 'Log in to post' using errcode = '28000';
  end if;
  if (select count(*) from public.board_posts where author = uid and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many posts, slow down' using errcode = 'P0001';
  end if;
  if new.parent_id is not null then
    select * into parent from public.board_posts where id = new.parent_id;
    if not found or parent.hidden or parent.parent_id is not null then
      raise exception 'That post is gone' using errcode = 'P0002';
    end if;
  end if;
  new.author := uid;
  new.author_name := coalesce(
    (select nullif(btrim(p.display_name), '') from public.profiles p where p.id = uid),
    (select nullif(left(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), 40), '')
       from auth.users u where u.id = uid),
    'Guitarist'
  );
  new.body := btrim(new.body);
  new.reports := 0;
  new.hidden := false;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists board_posts_before_insert on public.board_posts;
create trigger board_posts_before_insert before insert on public.board_posts
  for each row execute function public.board_posts_before_insert();

revoke all on function public.board_posts_before_insert() from public, anon, authenticated;

-- Changing your name on the Account page renames your posts too.
create or replace function public.board_posts_follow_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name is distinct from old.display_name and nullif(btrim(new.display_name), '') is not null then
    update public.board_posts set author_name = btrim(new.display_name) where author = new.id;
  end if;
  return new;
end $$;

drop trigger if exists board_posts_follow_name on public.profiles;
create trigger board_posts_follow_name after update of display_name on public.profiles
  for each row execute function public.board_posts_follow_name();

revoke all on function public.board_posts_follow_name() from public, anon, authenticated;

-- Members can report a post or reply once each; after 3 reports it's hidden until you look at it
-- (Table Editor → board_posts: untick hidden and set reports to 0 to bring it back, or delete the row).
create table if not exists public.board_reports (
  post_id bigint not null references public.board_posts (id) on delete cascade,
  reporter uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter)
);
alter table public.board_reports enable row level security;
revoke all on public.board_reports from anon, authenticated;

create or replace function public.report_board_post(post_id bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to report' using errcode = '28000';
  end if;
  insert into public.board_reports (post_id, reporter)
    select p.id, uid from public.board_posts p where p.id = post_id and p.author <> uid
    on conflict do nothing;
  if found then
    update public.board_posts p set reports = p.reports + 1, hidden = p.hidden or p.reports + 1 >= 3 where p.id = post_id;
  end if;
  return true;
end $$;

revoke all on function public.report_board_post(bigint) from public, anon;
grant execute on function public.report_board_post(bigint) to authenticated;
