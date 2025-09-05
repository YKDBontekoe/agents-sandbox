-- Citizens seed and count for client simulation determinism
alter table if exists game_state
  add column if not exists citizens_seed bigint,
  add column if not exists citizens_count int default 8;

