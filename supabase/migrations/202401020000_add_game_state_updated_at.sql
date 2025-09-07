-- Add updated_at column to game_state
alter table if exists game_state
  add column if not exists updated_at timestamptz not null default now();
