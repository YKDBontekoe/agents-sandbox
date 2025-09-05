-- Real-time cycle clock fields for game_state
alter table if exists game_state
  add column if not exists auto_ticking boolean default true,
  add column if not exists last_tick_at timestamptz default now(),
  add column if not exists tick_interval_ms integer default 60000;

-- Helpful index for scheduler queries
create index if not exists idx_game_state_last_tick on game_state (last_tick_at);

