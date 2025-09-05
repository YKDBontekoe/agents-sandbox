-- Add roads column to game_state for client-simulated path overlays
alter table if exists game_state
  add column if not exists roads jsonb not null default '[]';

