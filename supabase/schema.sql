create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_site_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_admins
    where site_admins.user_id = _user_id
  );
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  musician_name text not null default 'Untitled Musician',
  greeting text not null default '',
  profile_image_url text,
  profile_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (
    platform in ('youtube', 'instagram', 'apple_music', 'melon', 'soundcloud', 'spotify', 'custom')
  ),
  label text not null default '',
  url text not null check (url ~* '^https?://'),
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Track',
  lyrics text not null default '',
  image_url text,
  image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_totals (
  id smallint primary key default 1 check (id = 1),
  total_count bigint not null default 0 check (total_count >= 0)
);

create table if not exists public.daily_visits (
  visit_date date primary key,
  count bigint not null default 0 check (count >= 0)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists social_links_set_updated_at on public.social_links;
create trigger social_links_set_updated_at
before update on public.social_links
for each row execute function public.set_updated_at();

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at
before update on public.songs
for each row execute function public.set_updated_at();

insert into public.visitor_totals (id, total_count)
values (1, 0)
on conflict (id) do nothing;

insert into public.profiles (musician_name, greeting)
select 'Untitled Musician', '프로필과 인사말을 관리자 화면에서 등록해 주세요.'
where not exists (select 1 from public.profiles);

alter table public.site_admins enable row level security;
alter table public.profiles enable row level security;
alter table public.social_links enable row level security;
alter table public.songs enable row level security;
alter table public.visitor_totals enable row level security;
alter table public.daily_visits enable row level security;

drop policy if exists "Admins can read site_admins" on public.site_admins;
create policy "Admins can read site_admins"
on public.site_admins
for select
to authenticated
using (user_id = auth.uid() or public.is_site_admin(auth.uid()));

drop policy if exists "Admins can manage site_admins" on public.site_admins;
create policy "Admins can manage site_admins"
on public.site_admins
for all
to authenticated
using (public.is_site_admin(auth.uid()))
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_site_admin(auth.uid()))
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_site_admin(auth.uid()));

drop policy if exists "Social links are publicly readable" on public.social_links;
create policy "Social links are publicly readable"
on public.social_links
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert social links" on public.social_links;
create policy "Admins can insert social links"
on public.social_links
for insert
to authenticated
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can update social links" on public.social_links;
create policy "Admins can update social links"
on public.social_links
for update
to authenticated
using (public.is_site_admin(auth.uid()))
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can delete social links" on public.social_links;
create policy "Admins can delete social links"
on public.social_links
for delete
to authenticated
using (public.is_site_admin(auth.uid()));

drop policy if exists "Published songs are publicly readable" on public.songs;
create policy "Published songs are publicly readable"
on public.songs
for select
to anon, authenticated
using (status = 'published' or public.is_site_admin(auth.uid()));

drop policy if exists "Admins can insert songs" on public.songs;
create policy "Admins can insert songs"
on public.songs
for insert
to authenticated
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can update songs" on public.songs;
create policy "Admins can update songs"
on public.songs
for update
to authenticated
using (public.is_site_admin(auth.uid()))
with check (public.is_site_admin(auth.uid()));

drop policy if exists "Admins can delete songs" on public.songs;
create policy "Admins can delete songs"
on public.songs
for delete
to authenticated
using (public.is_site_admin(auth.uid()));

drop policy if exists "Visitor totals are readable" on public.visitor_totals;
create policy "Visitor totals are readable"
on public.visitor_totals
for select
to anon, authenticated
using (true);

drop policy if exists "Daily visits are readable" on public.daily_visits;
create policy "Daily visits are readable"
on public.daily_visits
for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.social_links, public.songs, public.visitor_totals, public.daily_visits to anon, authenticated;
grant select on public.site_admins to authenticated;
grant insert, update, delete on public.profiles, public.social_links, public.songs to authenticated;
grant insert, update, delete on public.site_admins to authenticated;
grant execute on function public.is_site_admin(uuid) to anon, authenticated;
