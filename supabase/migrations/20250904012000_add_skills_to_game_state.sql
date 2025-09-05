-- Add skills (unlocked skill ids) column to game_state
alter table if exists game_state
  add column if not exists skills jsonb not null default '[]';
