-- Add max_cycle column to game_state
alter table if exists game_state
  add column if not exists max_cycle int not null default 0;

-- Initialize max_cycle to current cycle where applicable
update game_state set max_cycle = greatest(max_cycle, cycle);
