-- Reconcile schema to align with API expectations
-- Safe to run multiple times; uses IF NOT EXISTS and catalog checks

-- Ensure UUID generator is available
create extension if not exists pgcrypto;

-- Ensure updated_at column exists on game_state
alter table if exists game_state
  add column if not exists updated_at timestamptz not null default now();

-- Ensure max_cycle column exists on game_state
alter table if exists game_state
  add column if not exists max_cycle int not null default 0;

-- Ensure proposals index exists
create index if not exists proposals_state_status_idx on proposals(state_id, status);

-- Ensure constraints exist when tables predate checks
do $$ begin
  -- proposals.status check
  if not exists (
    select 1 from pg_constraint
    where conname = 'proposals_status_check'
  ) then
    alter table if exists proposals
      add constraint proposals_status_check
      check (status in ('pending','accepted','rejected','applied'));
  end if;

  -- proposals.guild check
  if not exists (
    select 1 from pg_constraint
    where conname = 'proposals_guild_check'
  ) then
    alter table if exists proposals
      add constraint proposals_guild_check
      check (guild in ('Wardens','Alchemists','Scribes','Stewards'));
  end if;

  -- decisions.decision check
  if not exists (
    select 1 from pg_constraint
    where conname = 'decisions_decision_check'
  ) then
    alter table if exists decisions
      add constraint decisions_decision_check
      check (decision in ('accept','reject'));
  end if;
end $$;

