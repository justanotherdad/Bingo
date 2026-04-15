-- 004_realtime_and_policies.sql
-- Enables Supabase Realtime for the draws table so the TV display gets
-- instant ball notifications without relying on HTTP polling.
-- Also adds a public read policy so the anon client can subscribe.

-- ---------------------------------------------------------------------------
-- 1. Add draws to Realtime publication
--    (safe to run even if already added — Postgres deduplicates)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'draws'
  ) then
    alter publication supabase_realtime add table public.draws;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Allow anonymous (unauthenticated) reads on draws
--    The ball numbers are not sensitive; security lives in the display_token
--    on the games table. Without this policy the anon Realtime subscription
--    silently receives no rows and the display falls back to slow polling.
-- ---------------------------------------------------------------------------
drop policy if exists "anon_read_draws" on public.draws;

create policy "anon_read_draws"
  on public.draws
  for select
  using (true);

-- ---------------------------------------------------------------------------
-- 3. (Optional) Also add games to Realtime so status changes propagate
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;
