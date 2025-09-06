-- Add pinned skill targets to game_state for saving favorite/goal skills
alter table if exists game_state
  add column if not exists pinned_skill_targets jsonb not null default '[]';

