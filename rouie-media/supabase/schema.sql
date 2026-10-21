-- Rouie Media initial schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('viewer', 'admin');
create type public.video_visibility as enum ('public', 'private');
create type public.video_status as enum ('uploading', 'processing', 'ready', 'failed', 'removed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text not null default 'Rouie Member' check (char_length(display_name) between 1 and 80),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null default 'Other',
  visibility public.video_visibility not null default 'public',
  status public.video_status not null default 'uploading',
  original_file_name text,
  original_mime_type text,
  original_file_size bigint check (original_file_size is null or original_file_size > 0),
  provider_asset_id text unique,
  playback_id text,
  thumbnail_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  view_count bigint not null default 0 check (view_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_public_feed_idx on public.videos (published_at desc)
  where visibility = 'public' and status = 'ready';
create index videos_owner_idx on public.videos (owner_id, created_at desc);
create index videos_category_idx on public.videos (category, published_at desc);

create table public.subscriptions (
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, creator_id),
  check (subscriber_id <> creator_id)
);

create table public.saved_videos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.video_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.watch_history (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_video_idx on public.comments (video_id, created_at desc);

create table public.video_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  video_id uuid not null references public.videos(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 100),
  details text not null default '' check (char_length(details) <= 3000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles(id) on delete set null,
  video_id uuid references public.videos(id) on delete set null,
  action text not null,
  notes text not null default '' check (char_length(notes) <= 3000),
  created_at timestamptz not null default now()
);

-- Create a profile on sign-up. Role always defaults to viewer; user metadata cannot assign admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_username text;
begin
  safe_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'member'), '[^a-zA-Z0-9_]', '', 'g'));
  if length(safe_username) < 3 then safe_username := 'member_' || substr(new.id::text, 1, 8); end if;
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(safe_username, 22) || '_' || substr(new.id::text, 1, 6),
    left(coalesce(new.raw_user_meta_data->>'display_name', safe_username), 80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS enabled on every application table.
alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.saved_videos enable row level security;
alter table public.video_likes enable row level security;
alter table public.watch_history enable row level security;
alter table public.comments enable row level security;
alter table public.video_reports enable row level security;
alter table public.moderation_events enable row level security;

-- SECURITY DEFINER helper avoids recursive RLS when checking the profile role.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'::public.app_role
      and p.is_active = true
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- Profiles: public can view active public profile details; only self can update safe fields.
create policy "Profiles are viewable" on public.profiles
for select to anon, authenticated using (is_active = true or id = (select auth.uid()) or public.is_active_admin());

create policy "Users update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and role = 'viewer'::public.app_role
  and is_active = true
);

-- Videos: only ready, public videos are readable by visitors; owner/admin can inspect private content.
create policy "Public ready videos are readable" on public.videos
for select to anon, authenticated
using (
  (visibility = 'public' and status = 'ready')
  or owner_id = (select auth.uid())
  or public.is_active_admin()
);

-- No INSERT/UPDATE/DELETE policies for normal users on videos: only trusted server routes using service role can mutate.
create policy "Users can view own subscriptions" on public.subscriptions
for select to authenticated using (subscriber_id = (select auth.uid()) or public.is_active_admin());
create policy "Users can subscribe as themselves" on public.subscriptions
for insert to authenticated with check (subscriber_id = (select auth.uid()) and not public.is_active_admin());
create policy "Users can unsubscribe as themselves" on public.subscriptions
for delete to authenticated using (subscriber_id = (select auth.uid()));

create policy "Users view own saved videos" on public.saved_videos
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users save videos as themselves" on public.saved_videos
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own saved videos" on public.saved_videos
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users view likes" on public.video_likes
for select to authenticated using (user_id = (select auth.uid()) or public.is_active_admin());
create policy "Users like as themselves" on public.video_likes
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own likes" on public.video_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users view own history" on public.watch_history
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users update own history" on public.watch_history
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users upsert own history" on public.watch_history
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Visible comments readable" on public.comments
for select to anon, authenticated using (
  status = 'visible'
  and exists (select 1 from public.videos v where v.id = video_id and v.status = 'ready' and v.visibility = 'public')
  or user_id = (select auth.uid())
  or public.is_active_admin()
);
create policy "Signed in users add comments" on public.comments
for insert to authenticated with check (user_id = (select auth.uid()) and not public.is_active_admin());
create policy "Users edit own comments" on public.comments
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete own comments" on public.comments
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users submit reports" on public.video_reports
for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "Users see own reports; admins see all" on public.video_reports
for select to authenticated using (reporter_id = (select auth.uid()) or public.is_active_admin());
-- No regular-user update/delete policy for reports.

create policy "Admins view moderation events" on public.moderation_events
for select to authenticated using (public.is_active_admin());
-- Event inserts are made only through trusted server code using service role.

-- Keep internal service-role key on the server only. Never add it to NEXT_PUBLIC_* variables.
