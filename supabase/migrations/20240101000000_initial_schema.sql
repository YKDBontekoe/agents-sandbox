-- Ensure UUID generator is available
create extension if not exists pgcrypto;

-- Initial schema for Arcane Dominion
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
  guild text not null check (guild in ('Wardens','Alchemists','Scribes','Stewards')),
  title text not null,
  description text not null,
  predicted_delta jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','applied')),
  gen_prompt_version text,
  gen_model_version text,
  scry_prompt_version text,
  scry_model_version text
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  proposal_id uuid references proposals(id) on delete cascade,
  decision text not null check (decision in ('accept','reject')),
  scry_delta jsonb,
  comment text
);

create index if not exists proposals_state_status_idx on proposals(state_id, status);
