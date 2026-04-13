-- Secret token for TV display URLs (paired with game id). Not exposed in anon RLS;
-- validated server-side via service role in /api/game/.../display.

alter table public.games
  add column if not exists display_token uuid not null default gen_random_uuid();

create unique index if not exists games_display_token_key
  on public.games (display_token);
