-- Expand allowed win_pattern values to cover the new pattern catalog
-- (heart, tree, diamond, plus sign, dollar sign, etc.).

alter table public.games
  drop constraint if exists games_win_pattern_check;

alter table public.games
  add constraint games_win_pattern_check
  check (
    win_pattern in (
      'straight_line',
      'straight_line_across',
      'straight_line_down',
      'diagonal_line',
      'x_pattern',
      'postage_stamp',
      'four_corners',
      'four_corners_stamp',
      'four_stamps',
      'plus_sign',
      'diamond',
      'heart',
      'tree',
      'dollar_sign',
      'full_board',
      'double_line'
    )
  );
