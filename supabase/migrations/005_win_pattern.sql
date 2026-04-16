-- Win pattern for the room (informational; players mark paper cards).

alter table public.games
  add column if not exists win_pattern text;

update public.games
  set win_pattern = 'straight_line'
  where win_pattern is null;

alter table public.games
  alter column win_pattern set default 'straight_line';

alter table public.games
  alter column win_pattern set not null;

alter table public.games
  drop constraint if exists games_win_pattern_check;

alter table public.games
  add constraint games_win_pattern_check
  check (
    win_pattern in (
      'straight_line',
      'x_pattern',
      'postage_stamp',
      'four_corners',
      'full_board',
      'double_line'
    )
  );
