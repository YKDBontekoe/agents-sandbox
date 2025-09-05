# Arcane Dominion Agents Guide

This guide defines the agent architecture, prompting standards, safety, and ops practices for the Arcane Dominion Tycoon. It is the canonical reference for building, extending, and operating the AI council.

Related docs: docs/agents/ARCHITECTURE.md, docs/agents/PROMPTS.md, docs/agents/SECURITY.md, docs/agents/OPERATIONS.md, docs/agents/EVALUATION.md, docs/agents/EXTENSIONS.md, docs/agents/CONTRIBUTING.md

## Core Focus of the Game

- Fantasy: rule a fragile arcane city-state via a council of guilds.
- Pillars: scarcity management, risk tradeoffs, legible cause→effect, conservative forecasting.
- Loop: Observe → Propose → Scry → Decree → Execute → Progress (tick).
- Tensions: wards decay each cycle; unrest and threat rise by default; coin and mana are scarce.
- Player Goal: maintain stability while growing capacity; avoid runaway unrest/threat and bankruptcy.
- Agent Role: produce grounded, plausible proposals (with costs) and sober forecasts; never “magic away” constraints.

## Quick Start

- Requirements: Node 18+, Supabase project, OpenAI API key
- Env (.env.local): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (optional), `NEXT_PUBLIC_LOG_LEVEL` (optional), `NEXT_PUBLIC_OFFLINE_MODE` (optional), `NEXT_PUBLIC_DISABLE_REALTIME` (optional), `VERCEL_ENV` (optional)
- Config keys:
  - `NODE_ENV` (default `development`)
  - `VERCEL_ENV` (default `local`)
  - `NEXT_PUBLIC_LOG_LEVEL` (default `debug` in development, `error` otherwise)
  - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
  - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (required)
  - `SUPABASE_JWT_SECRET` (required)
  - `OPENAI_API_KEY` (optional)
  - `NEXT_PUBLIC_OFFLINE_MODE` (default `false`)
  - `NEXT_PUBLIC_DISABLE_REALTIME` (default `false`)
- DB: apply migrations via `supabase link` then `supabase db push --include-all`, or run SQL in `supabase/migrations/` in order

## Architecture Overview

- App: Next.js App Router (`src/app`)
- Storage: Supabase tables `game_state`, `proposals`
- Agents: Implemented in API routes using OpenAI via `ai` SDK
  - Generate proposals: `POST /api/proposals/generate` (guild-scoped)
  - Scry forecast: `POST /api/proposals/[id]/scry` (conservative deltas)
  - Decide: `POST /api/proposals/[id]/decide` (accept/reject)
  - Tick cycle: `POST /api/state/tick` (apply accepted, natural pressures)
- Supabase helpers: `src/lib/supabase/server.ts` (service role), `src/lib/supabase/browser.ts` (anon)
- Frontend: `/play` for council loop (observe → propose → scry → decree → execute → progress)
  - HUD: right-rail stacked panels (Resources, Time, MiniMap, Actions, Skill Tree)
  - Onboarding: guided first session with free starter builds (Farm, House, Council Hall)
  - MiniMap: camera-aware with follow-selection option
  - Skill Tree: procedural, category-aligned; unlocked skills modify production

## Directory Structure (Agent-Relevant)

- `src/app/api/` — server routes (agents live here)
  - `state/route.ts` (GET): fetch/create latest game state
  - `state/tick/route.ts` (POST): apply accepted proposals and natural pressures
  - `proposals/route.ts` (GET): list proposals for current state
  - `proposals/generate/route.ts` (POST): guild agent proposal creation
  - `proposals/[id]/scry/route.ts` (POST): oracle forecast per proposal
  - `proposals/[id]/decide/route.ts` (POST): accept/reject
- `src/lib/supabase/` — clients
  - `server.ts` (service role; server-only writes)
  - `browser.ts` (anon; read-focused)
- `docs/agents/` — this guide and deep dives
- `supabase/migrations/` — schema and idempotent updates for `game_state`, `proposals`

## Design Canon

- Guilds: Wardens (defense), Alchemists (resources), Scribes (infrastructure), Stewards (policy)
- Resources: grain, coin, mana, favor, wood, planks, unrest, threat
- Default pressures: mana −5, unrest +1, threat +1 each tick
- Tone: concise, diegetic, council deliberation — no meta commentary

Success/Failure Signals

- Healthy: moderate unrest/threat (< 10), positive grain/coin flow, stable mana.
- Warning: sustained negative coin/mana; unrest or threat rising > 2 per tick.
- Failure: resource collapse (coin/mana/grain=0) coupled with high unrest/threat; agents should bias stability.

## Agent Principles

- JSON-first: all AI outputs are strict, parseable JSON (no prose outside JSON)
- Deterministic by default: prefer lower temperature, constrained schemas, minimal randomness
- Idempotent writes: server routes own writes; never perform direct client writes
- Least privilege: never expose service role keys; use anon client only for reads in browser
- Validated inputs/outputs: zod schemas for bodies and AI responses; reject on violation
- Safety over cleverness: bounded actions, explicit tools, refusal for out-of-scope asks
- Traceable: log prompts, models, and decisions with request IDs and redaction

### Defaults (recommended)

- Model: `gpt-4o-mini` or similar JSON-capable small model
- Temperature: 0.1–0.3 (proposal), 0.0–0.2 (scry)
- Max tokens: 256 (proposal), 128 (scry)
- Timeout: 10s (proposal), 6s (scry)
- Retries: 2 with exponential backoff (250ms, 1s)

Delta Semantics

- Additive, numeric deltas per resource; negatives are costs.
- Clamp floors at 0 post-application; do not clamp predicted deltas before storage.
- Prefer small magnitudes; align benefits with corresponding costs (e.g., coin↓ when grain↑).

Production Modifiers (skills/logistics/terrain)

- Skills: unlocked skills apply multipliers to specific resources and/or building types and may adjust grain upkeep per worker.
- Logistics: producers connected to a `storehouse` via routes gain a modest output bonus.
- Terrain: adjacency affects output (e.g., farms near water, lumber camps in dense forest, shrines near mountains).
- Agents should consider these modifiers when proposing and scrying; current modifiers are passed to prompts.

## Prompting Standards

- Proposal generation system role: “Roleplay the guild. Output JSON array [{ title, description, predicted_delta }]”
- Scry system role: “Conservative oracle. Output JSON { predicted_delta, risk_note }”
- Always include current resources to ground proposals and forecasts
- Enforce schema via JSON mode / schema when available; otherwise clamp by zod + repair pass
- Keep titles concise; justify deltas implicitly via description, not extra commentary
See docs/agents/PROMPTS.md for full examples, JSON Schemas, and repair strategy

## API Contracts

- POST `/api/proposals/generate` body: `{ guild?: string }` → inserts proposals for latest state
- POST `/api/proposals/[id]/scry` body: `{}` → updates `predicted_delta` on proposal
- POST `/api/proposals/[id]/decide` body: `{ decision: 'accept' | 'reject' }`
- POST `/api/state/tick` body: `{}` → applies accepted deltas then pressures
- GET `/api/state` → fetches or creates latest state
All inputs validated with zod. All outputs are JSON.

Pre/Post Conditions (per route)

- Generate: requires a latest `game_state`; inserts 1–3 `pending` proposals.
- Scry: requires an existing proposal; overwrites `predicted_delta` conservatively.
- Decide: flips `status` to `accepted` or `rejected`; never mutates deltas.
- Tick: applies all `accepted` deltas once, clamps floors, then sets proposals to `applied`.

## Data Shapes

- Proposal: `{ id, state_id, guild, title, description, predicted_delta: Record<string, number>, status }`
- GameState: `{ id, cycle, resources: { grain, coin, mana, favor, unrest, threat }, updated_at }`
`predicted_delta` values are numeric and additive; negatives allowed where sensible.

Recommended bounds (soft): grain ±500, wood ±400, planks ±300, coin ±100, mana ±50, favor ±10, unrest ±10, threat ±10. Outliers should be rare and justified.

## Safety & Security

- Secrets only on server: service role client in `server.ts`; never in browser
- RLS and access: all writes via API routes; anon client read-only UI
- Guardrails: schema validation, numeric range checks, tool allowlist; refuse unsafe actions
See docs/agents/SECURITY.md for detailed checklists

## Operations

- Model settings: favor JSON/schema output; low temperature; short context
- Reliability: timeouts, retries with jitter, idempotent updates
- Observability: per-request trace IDs; log prompts/responses with PII redaction
- Cost: cap tokens per call; cache stable prompts; backoff on rate limits
See docs/agents/OPERATIONS.md for runbooks

## Evaluation & Testing

- Unit: validate proposal/scry JSON against zod; clamp out-of-range deltas
- Simulation: run tick sequences to ensure pressures dominate in absence of decrees
- UI manual: use `/play` to propose → scry → decide → tick
Targets: ≥99% JSON validity, <1% parse errors, bounded deltas within recommended ranges. Include runs with skill modifiers and storehouse logistics. See docs/agents/EVALUATION.md for harness ideas and checklists

## Extending the Council

- Seasons & Omens: add seasonal flags/table; vary tick pressures
- Alignments: per-guild or per-proposal traits influencing prompts and deltas
- New Actions: structured `action_type`, `cost`, `requirements` with schema
See docs/agents/EXTENSIONS.md for patterns and pitfalls

## Workflow

- Branch per feature; update DB and API first, then wire UI
- Version prompts; record model+settings; keep JSON-first discipline
- Add guards before enabling new agent capabilities in production

## Quick Checklist

- Prompts: JSON-only, include current resources, use guild tone
- Models: low temp, bounded tokens, short context
- Validation: zod schemas pass; clamp resource floors to 0
- Safety: no secrets client-side; writes via server routes only
- Ops: timeouts, retries, minimal logs with redaction


## Building Catalog (client-visible)

- Farm: grain↑ (terrain: water adjacency boosts output)
- House: workers↑ (consumes grain)
- Council Hall: unlocks proposals/decrees
- Trade Post: converts grain→coin (route/tariff influenced)
- Automation Workshop: coin↑ (consumes mana)
- Shrine: favor↑ (terrain: mountain adjacency boosts)
- Lumber Camp: wood↑ (terrain: forest adjacency boosts)
- Sawmill: planks↑ (consumes wood)
- Storehouse: logistics hub; boosts connected producers

## Gameplay Onboarding (client)

- First-time flow grants one free Farm, House, and Council Hall to accelerate ramp.
- A minimal questlet surfaces immediate goals (Farm → House → Assign → Council → Proposals → Advance).
- Agents should assume steady-state rules post-onboarding; freebies are handled client-side.

## Agent Context Payloads (expanded)

- Backend includes the following to proposals/scry prompts:
  - Current resources (including wood, planks when present)
  - Snapshot of buildings (counts per type), routes, and storehouse presence
  - Terrain/adjacency summaries where material
  - Active skill modifiers:
    - `resource_multipliers: Record<resource, number>`
    - `building_multipliers: Record<typeId, number>`
    - `upkeep_grain_per_worker_delta: number`
  - Agents should treat modifiers as small tilts and keep forecasts conservative.
