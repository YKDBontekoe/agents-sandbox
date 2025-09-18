-- Add era progression fields to game_state
alter table if exists game_state
  add column if not exists quests_completed int not null default 0,
  add column if not exists milestones jsonb not null default '{}',
  add column if not exists era jsonb not null default '{}';
