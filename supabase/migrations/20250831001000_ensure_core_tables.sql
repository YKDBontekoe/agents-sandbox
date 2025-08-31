-- Ensure core tables exist even if earlier migrations were marked applied
-- Safe to run multiple times

create extension if not exists pgcrypto;

create table if not exists game_state (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cycle int not null default 1,
  resources jsonb not null default '{"grain": 1000, "coin": 500, "mana": 200, "favor": 10, "unrest": 0, "threat": 0}',
  notes text
);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  state_id uuid references game_state(id) on delete cascade,
  guild text not null,
  title text not null,
  description text not null,
  predicted_delta jsonb not null default '{}',
  status text not null default 'pending'
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  proposal_id uuid references proposals(id) on delete cascade,
  decision text not null,
  scry_delta jsonb,
  comment text
);

-- Add missing constraints and index if needed
-- Check constraints (PostgreSQL doesn't support IF NOT EXISTS for constraints)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proposals_guild_check') then
    alter table proposals add constraint proposals_guild_check
      check (guild in ('Wardens','Alchemists','Scribes','Stewards'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'proposals_status_check') then
    alter table proposals add constraint proposals_status_check
      check (status in ('pending','accepted','rejected','applied'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'decisions_decision_check') then
    alter table decisions add constraint decisions_decision_check
      check (decision in ('accept','reject'));
  end if;
end $$;

create index if not exists proposals_state_status_idx on proposals(state_id, status);

