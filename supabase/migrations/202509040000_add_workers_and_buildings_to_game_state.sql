-- Add workers and buildings columns to game_state
alter table if exists game_state
  add column if not exists workers int not null default 0,
  add column if not exists buildings jsonb not null default '[]';
