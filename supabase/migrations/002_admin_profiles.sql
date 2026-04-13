-- Admin area: profiles, roles, global settings, updated RLS for bans + admin access.
-- After migrate: promote your user in SQL Editor:
--   insert into public.user_roles (user_id, role)
--   values ('YOUR_USER_UUID', 'admin')
--   on conflict (user_id) do update set role = excluded.role;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth user; email duplicated for admin directory)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  city text not null default '',
  state text not null default '',
  banned_at timestamptz,
  banned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Roles: exactly one row per user ('user' | 'admin')
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'admin')) default 'user'
);

-- ---------------------------------------------------------------------------
-- Global options (tune without redeploying; some rows readable when is_public)
-- ---------------------------------------------------------------------------
create table public.global_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.global_settings (key, value, is_public) values
  ('maintenance_mode', 'false'::jsonb, true),
  ('signup_enabled', 'true'::jsonb, true),
  ('max_host_sessions_per_day', '5'::jsonb, true),
  ('idle_timeout_minutes', '60'::jsonb, true),
  ('allow_new_host_sessions', 'true'::jsonb, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER: read underlying tables without RLS recursion issues)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'admin'
  );
$$;

create or replace function public.user_is_not_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.banned_at is not null
  );
$$;

-- ---------------------------------------------------------------------------
-- New user → profile + default role (runs as definer; bypasses RLS)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Only admins may change ban fields (hosts cannot unban themselves)
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_ban_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' then
    if (
      new.banned_at is distinct from old.banned_at
      or new.banned_reason is distinct from old.banned_reason
    ) and not public.is_admin() then
      raise exception 'Only admins may change ban fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_ban
  before update on public.profiles
  for each row
  execute function public.profiles_guard_ban_fields();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- ---------------------------------------------------------------------------
-- Stats view (respects RLS on profiles via security invoker)
-- ---------------------------------------------------------------------------
create or replace view public.admin_user_stats
with (security_invoker = true) as
select
  p.id,
  p.email,
  p.display_name,
  p.city,
  p.state,
  p.created_at as signup_at,
  p.banned_at,
  p.banned_reason,
  coalesce(r.role, 'user') as role,
  (
    select count(*)::bigint
    from public.games g
    where g.user_id = p.id
  ) as games_hosted
from public.profiles p
left join public.user_roles r on r.user_id = p.id;

-- ---------------------------------------------------------------------------
-- Replace host_sessions / games / draws policies: not banned + admin override
-- ---------------------------------------------------------------------------
drop policy if exists "Users manage own host_sessions" on public.host_sessions;
create policy "Users manage own host_sessions"
  on public.host_sessions
  for all
  using (
    (
      user_id = (select auth.uid())
      and public.user_is_not_banned()
    )
    or public.is_admin()
  )
  with check (
    (
      user_id = (select auth.uid())
      and public.user_is_not_banned()
    )
    or public.is_admin()
  );

drop policy if exists "Users manage own games" on public.games;
create policy "Users manage own games"
  on public.games
  for all
  using (
    (
      user_id = (select auth.uid())
      and public.user_is_not_banned()
    )
    or public.is_admin()
  )
  with check (
    (
      user_id = (select auth.uid())
      and public.user_is_not_banned()
    )
    or public.is_admin()
  );

drop policy if exists "Users manage draws for own games" on public.draws;
create policy "Users manage draws for own games"
  on public.draws
  for all
  using (
    exists (
      select 1
      from public.games g
      where g.id = draws.game_id
        and (
          (
            g.user_id = (select auth.uid())
            and public.user_is_not_banned()
          )
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.games g
      where g.id = draws.game_id
        and (
          (
            g.user_id = (select auth.uid())
            and public.user_is_not_banned()
          )
          or public.is_admin()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: profiles, user_roles, global_settings
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.global_settings enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = (select auth.uid()) and public.user_is_not_banned())
  with check (id = (select auth.uid()));

create policy "profiles_update_admin"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "user_roles_select"
  on public.user_roles
  for select
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "user_roles_admin_mutate"
  on public.user_roles
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "global_settings_select"
  on public.global_settings
  for select
  using (is_public or public.is_admin());

create policy "global_settings_admin_write"
  on public.global_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants: view readable under same policies as profiles (invoker)
-- ---------------------------------------------------------------------------
grant select on public.admin_user_stats to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill for accounts created before this migration (optional; safe to re-run)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, display_name)
select u.id, u.email, ''
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.user_roles (user_id, role)
select u.id, 'user'
from auth.users u
where not exists (select 1 from public.user_roles r where r.user_id = u.id);
