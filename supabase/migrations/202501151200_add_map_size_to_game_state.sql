-- Add map_size column to game_state for storing selected map dimensions
alter table if exists game_state
  add column if not exists map_size int not null default 32;