-- Add routes column to game_state
alter table if exists game_state
  add column if not exists routes jsonb not null default '[]';

