-- Add edicts column to game_state
alter table if exists game_state
  add column if not exists edicts jsonb not null default '{}'::jsonb;

