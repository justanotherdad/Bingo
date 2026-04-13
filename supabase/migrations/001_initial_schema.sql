-- Bingo host app — initial schema (Supabase / Postgres)
-- Assumptions:
-- - Auth: Supabase Auth (auth.users). Turn OFF "Confirm email" in Dashboard for v1; add Resend/SMTP later.
-- - One active game per user; one active host_session per user.
-- - Up to 5 new host_sessions per user per UTC calendar day.
-- - Retain metadata for the 25 most recently ended games per user (completed + cancelled).
-- - Inactivity: app or scheduled job calls public.expire_stale_games() so active games auto-end
--   (default 1 hour after last_activity_at). last_activity_at bumps on each new draw (trigger).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- host_sessions: a "hosting period" for the day/event (5 starts per UTC day)
-- ---------------------------------------------------------------------------
create table public.host_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint host_sessions_ended_after_started check (ended_at is null or ended_at >= started_at)
);

-- At most one active (not ended) host session per user
create unique index host_sessions_one_active_per_user
  on public.host_sessions (user_id)
  where ended_at is null;

create index host_sessions_user_started on public.host_sessions (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- games: one bingo run (board); many per host_session while session is open
-- ---------------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  host_session_id uuid not null references public.host_sessions (id) on delete cascade,
  ball_preset text not null
    check (ball_preset in ('US-75', 'UK-90')),
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  constraint games_ended_after_started check (ended_at is null or ended_at >= started_at)
);

-- Only one active game per user at a time
create unique index games_one_active_per_user
  on public.games (user_id)
  where status = 'active';

create index games_user_session on public.games (user_id, host_session_id);
create index games_user_ended on public.games (user_id, ended_at desc nulls last);
create index games_active_stale on public.games (status, last_activity_at)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- draws: ordered numbers for a game (immutable after insert; use app logic)
-- ---------------------------------------------------------------------------
create table public.draws (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  number int not null,
  draw_order int not null,
  created_at timestamptz not null default now(),
  constraint draws_order_positive check (draw_order >= 1),
  unique (game_id, draw_order),
  unique (game_id, number)
);

create index draws_game_order on public.draws (game_id, draw_order);

-- Bump parent game activity when a number is drawn (counts as activity for idle timeout)
create or replace function public.touch_game_last_activity_from_draw()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set last_activity_at = now()
  where id = new.game_id
    and status = 'active';

  return new;
end;
$$;

create trigger trg_draws_touch_game_activity
  after insert on public.draws
  for each row
  execute function public.touch_game_last_activity_from_draw();

-- Mark active games as cancelled if idle longer than p_idle (server-side; schedule via pg_cron or Supabase cron)
create or replace function public.expire_stale_games(p_idle interval default interval '1 hour')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.games g
  set
    status = 'cancelled',
    ended_at = now()
  where g.status = 'active'
    and g.last_activity_at < (now() - p_idle);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Optional: call from Supabase Dashboard → Database → Cron (pg_cron), e.g. every 5 minutes:
-- select public.expire_stale_games(interval '1 hour');

-- ---------------------------------------------------------------------------
-- Enforce max 5 host_sessions started per user per UTC day
-- ---------------------------------------------------------------------------
create or replace function public.enforce_host_session_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*)::int into n
  from public.host_sessions s
  where s.user_id = new.user_id
    and (s.started_at at time zone 'utc')::date = (new.started_at at time zone 'utc')::date;

  if n >= 5 then
    raise exception 'Daily host session limit (5) reached for this UTC date';
  end if;

  return new;
end;
$$;

create trigger trg_host_sessions_daily_limit
  before insert on public.host_sessions
  for each row
  execute function public.enforce_host_session_daily_limit();

-- ---------------------------------------------------------------------------
-- Keep at most 25 ended games per user (completed + cancelled)
-- Deletes older ended games and cascading draws.
-- ---------------------------------------------------------------------------
create or replace function public.prune_ended_games_to_25()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
     and old.status = 'active'
     and new.status in ('completed', 'cancelled')
     and new.ended_at is not null
  then
    delete from public.games g
    where g.user_id = new.user_id
      and g.status in ('completed', 'cancelled')
      and g.id in (
        select id
        from public.games
        where user_id = new.user_id
          and status in ('completed', 'cancelled')
        order by ended_at desc nulls last, created_at desc
        offset 25
      );
  end if;

  return new;
end;
$$;

create trigger trg_games_prune_history
  after update of status, ended_at on public.games
  for each row
  execute function public.prune_ended_games_to_25();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.host_sessions enable row level security;
alter table public.games enable row level security;
alter table public.draws enable row level security;

-- host_sessions: owner only
create policy "Users manage own host_sessions"
  on public.host_sessions
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- games: owner only
create policy "Users manage own games"
  on public.games
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- draws: via owning game
create policy "Users manage draws for own games"
  on public.draws
  for all
  using (
    exists (
      select 1 from public.games g
      where g.id = draws.game_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.games g
      where g.id = draws.game_id
        and g.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: enable replication for TV/controller subscriptions (adjust if you
-- only use broadcast). In Dashboard: enable Realtime for games + draws if needed.
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.games;
-- alter publication supabase_realtime add table public.draws;
