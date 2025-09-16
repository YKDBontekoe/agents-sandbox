# Arcane Dominion Agents Guide

_Last updated: 2025-09-15. Keep this guide evolving alongside the game; when you change systems or knowledge, update the relevant sections and cross-links._

This guide is the canonical reference for building, extending, and operating the Arcane Dominion Tycoon agent council. It consolidates domain lore, architecture, prompting conventions, operations runbooks, and delivery workflows so every contributor—human or AI—can work efficiently and safely.

Related deep dives live in `docs/agents/` (ARCHITECTURE, PROMPTS, SECURITY, OPERATIONS, EVALUATION, EXTENSIONS, CONTRIBUTING) and `docs/architecture/`. Decision records are in `docs/adr/`.

## Table of Contents

1. [World & Player Pillars](#world--player-pillars)
2. [Quick Setup & Environment](#quick-setup--environment)
3. [Systems Overview](#systems-overview)
4. [Directory Map](#directory-map)
5. [Data & API Contracts](#data--api-contracts)
6. [Agent Responsibilities & Principles](#agent-responsibilities--principles)
7. [Prompting Standards](#prompting-standards)
8. [Efficiency Playbook](#efficiency-playbook)
9. [Safety & Security](#safety--security)
10. [Operations & Observability](#operations--observability)
11. [Testing & Evaluation](#testing--evaluation)
12. [Extending the Council](#extending-the-council)
13. [Delivery Workflow & Required Checks](#delivery-workflow--required-checks)
14. [Reference Appendices](#reference-appendices)

---

## World & Player Pillars

- **Fantasy**: Rule a fragile arcane city-state through a guild council.
- **Gameplay Loop**: Observe → Propose → Scry → Decree → Execute → Progress (tick).
- **Core Tensions**: Wards decay each cycle; unrest and threat trend upward; coin and mana remain scarce.
- **Player Goal**: Maintain stability while expanding capacity; avoid runaway unrest/threat and bankruptcy.
- **Agent Tone**: Diegetic, council deliberation, no meta commentary.
- **Success Bands**:
  - Healthy: unrest/threat < 10, positive grain/coin flow, stable mana.
  - Warning: prolonged negative coin/mana; unrest or threat rising > 2 per tick.
  - Failure: resource collapse (grain/coin/mana == 0) with high unrest/threat.
- **Guild Identities**: Wardens (defense), Alchemists (resources), Scribes (infrastructure), Stewards (policy).
- **Default Pressures**: Mana −5, unrest +1, threat +1 each tick. Agents bias toward stability.

## Quick Setup & Environment

- **Requirements**: Node 18+, Supabase project, optional OpenAI API key.
- **Environment Variables (.env.local)**:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Optional: `OPENAI_API_KEY`, `NEXT_PUBLIC_LOG_LEVEL`, `NEXT_PUBLIC_OFFLINE_MODE`, `NEXT_PUBLIC_DISABLE_REALTIME`, `VERCEL_ENV`
- **Config Defaults**:
  - `NODE_ENV=development`, `VERCEL_ENV=local`
  - `NEXT_PUBLIC_LOG_LEVEL=debug` in development, `error` otherwise
  - Offline/realtime toggles default to `false`
- **Database**: Link Supabase (`supabase link`) then `supabase db push --include-all`, or apply SQL in `supabase/migrations/` sequentially.
- **After Editing Code**: run `npm run lint`, `npm run test`, and `npm run build` to validate changes and ensure the game compiles. For documentation-only edits, explain in your PR why automated checks were skipped.

## Systems Overview

- **App**: Next.js App Router under `src/app`.
- **Storage**: Supabase tables `game_state` and `proposals`.
- **Agents**: Implemented in API routes using the `ai` SDK (default model `gpt-4o-mini`).
- **Core API Routes**:
  - `POST /api/proposals/generate`: Guild-scoped proposal creation.
  - `POST /api/proposals/[id]/scry`: Conservative forecast of proposal impact.
  - `POST /api/proposals/[id]/decide`: Accept or reject proposals.
  - `POST /api/state/tick`: Apply accepted proposals, natural pressures, clamps.
  - `GET /api/state`: Fetch or create the latest game state.
- **Frontend Flow (`/play`)**: Right-rail HUD (Resources, Time, MiniMap, Actions, Skill Tree). Guided onboarding grants one free Farm, House, Council Hall to accelerate ramp.
- **Rendering**: PIXI-based layers (`GameLayers`, `BuildingsLayer`, `effects`, etc.), accessible HUD modules, canvas icon drawers.
- **Simulation Packages**: `packages/engine/src/simulation/{traffic,zoning,transport}` for systemic behaviors.

## Directory Map

- `src/app/api/state/route.ts`: GET latest state.
- `src/app/api/state/tick/route.ts`: POST tick resolution (apply deltas, pressures, clamps).
- `src/app/api/proposals/route.ts`: GET proposals for current state.
- `src/app/api/proposals/generate/route.ts`: POST to generate proposals.
- `src/app/api/proposals/[id]/scry/route.ts`: POST scry update.
- `src/app/api/proposals/[id]/decide/route.ts`: POST accept/reject.
- `src/lib/supabase/server.ts`: Service-role client (server-only writes).
- `src/lib/supabase/browser.ts`: Anon client (read-oriented).
- `docs/agents/`: Architecture, prompts, security, operations, evaluation, extensions, contributing.
- `supabase/migrations/`: Schema and idempotent updates for Supabase tables.
- `src/state/`: Client state slices (`notifications`, `session`, `game`) combined in `slices/index.ts`; persistence utilities.
- `src/components/game/`: Buildings, HUD, effects, city panels, skills, accessibility helpers, etc.
- `packages/engine/`: Simulation subsystems.

## Data & API Contracts

- **Proposal**: `{ id, state_id, guild, title, description, predicted_delta: Record<string, number>, status }`
- **GameState**: `{ id, cycle, resources: { grain, coin, mana, favor, unrest, threat, wood?, planks? }, updated_at }`
- **Predicted Delta**: numeric, additive; negatives allowed when sensible. Clamp floors to ≥ 0 after tick application; do not clamp predictions before storage.
- **Soft Bounds**: grain ±500, wood ±400, planks ±300, coin ±100, mana ±50, favor ±10, unrest ±10, threat ±10. Outliers must be justified.
- **Route Preconditions**:
  - Generate: latest `game_state` required; inserts 1–3 `pending` proposals.
  - Scry: existing proposal required; overwrites `predicted_delta` conservatively.
  - Decide: updates `status` to `accepted` or `rejected`; deltas remain untouched.
  - Tick: applies accepted deltas once, clamps floors, marks proposals `applied`.
- **Validation**: All inputs pass through zod schemas; repair loops reject invalid JSON.

### Agent Context Payload

Agents receive:

- Current resources (grain, coin, mana, favor, unrest, threat, and optional wood/planks).
- Building snapshot (counts per type), logistics routes, storehouse presence.
- Terrain/adjacency summaries.
- Active skill modifiers (defaults: multipliers start at `1`, upkeep delta at `0`):
  - `resource_multipliers: Record<Resource, number>`
  - `building_multipliers: Record<BuildingType, number>`
  - `upkeep_grain_per_worker_delta: number`
  - `global_building_output_multiplier: number`
  - `global_resource_output_multiplier: number`
  - `route_coin_output_multiplier: number`
  - `patrol_coin_upkeep_multiplier: number`
  - `building_input_multiplier: number`
- Special abilities flow through these multipliers; see [Skill Special Abilities & Derived Multipliers](#skill-special-abilities--derived-multipliers).
- Treat modifiers as small tilts; keep forecasts conservative.

## Agent Responsibilities & Principles

- **JSON Discipline**: Outputs must be strict, parseable JSON. No prose outside JSON payloads.
- **Determinism First**: Prefer low temperature, constrained schemas, minimal randomness.
- **Idempotent Writes**: Server routes own writes; never mutate client state directly.
- **Least Privilege**: Service role keys live only server-side; browsers use anon client for reads.
- **Validation**: Guard bodies and AI responses with zod; reject or repair invalid data.
- **Safety Over Cleverness**: Bounded actions, explicit tool lists, refuse out-of-scope asks.
- **Traceability**: Log prompts, model versions, request IDs with sensitive data redacted.
- **Conservative Forecasting**: Bias toward stability; small magnitudes; pair benefits with costs (e.g., grain↑ usually costs coin↓ or mana↓).
- **Clamp After Application**: Floors at 0 applied post-tick; forecasts remain raw.
- **Skill & Logistics Awareness**: Account for storehouse bonuses, adjacency, and every field in `skill_modifiers` (global/route/patrol multipliers, input discounts, upkeep deltas) when evaluating deltas. Special ability spikes should inform narrative justification but forecasts remain conservative.

## Prompting Standards

- **Proposal Generation**:
  - System prompt: “Roleplay the guild. Output JSON array [{ title, description, predicted_delta }]”.
  - Include current resources, terrain, skills, logistics context.
  - Recommended model: `gpt-4o-mini`, temperature 0.1–0.3, max tokens ≈256, timeout 10s, retries 2 (250 ms → 1 s backoff).
- **Scry Forecast**:
  - System prompt: “Conservative oracle. Output JSON { predicted_delta, risk_note }”.
  - Temperature 0.0–0.2, max tokens ≈128, timeout 6s, same retry strategy.
- **Schema Enforcement**:
  - Use JSON mode or JSON schema features when available; otherwise rely on zod validation plus a repair pass.
  - Keep titles concise; embed justification inside `description` or `risk_note`.
- **Debug Workflow**:
  1. Log request/response payload with redaction.
  2. Validate via zod.
  3. If invalid, run deterministic repair prompt; escalate to incident notes if failure rate >1%.
- **Reference**: `docs/agents/PROMPTS.md` for templates, JSON schemas, and repair strategies.

## Efficiency Playbook

- **Prompt Reuse**: Cache static system + instruction prompts; only interpolate dynamic state.
- **Context Budgeting**: Trim historical context to the last relevant tick; avoid redundant summaries.
- **Schema Hints**: Provide explicit numeric bounds and unit hints inside prompts to reduce parse errors.
- **Batching**: Generate multiple proposals per call (1–3) but cap at manageable complexity; do not exceed tick budgets.
- **Failure Handling**: Implement structured retries (exponential backoff) and fallback summaries for UI if all retries fail.
- **Latency Targets**: Keep proposal round trips < 2 s median, scry < 1 s. Investigate or degrade gracefully if exceeded.
- **Logging Hygiene**: Use concise JSON logs with request IDs; avoid verbose dumps in production.
- **Profiling**: When latency spikes, capture prompt/response size, model latency, and Supabase timings; document findings in runbooks.
- **Knowledge Updates**: When lore or mechanics change, update prompts, schemas, and this guide in the same PR.

## Safety & Security

- Secrets remain server-side; browsers receive only anon Supabase keys.
- Role-based access: All writes flow through API routes; UI uses read-only anon client.
- Guardrails: Schema validation, numeric range checks, tool allowlists, refusal patterns for unsafe asks.
- Review `docs/agents/SECURITY.md` for hardening checklists, incident response contacts, and data retention policy.

## Operations & Observability

- **Model Settings**: Low temperature, bounded max tokens, concise context.
- **Reliability**: Timeouts, retries with jitter, idempotent updates.
- **Rate Limiting**: Handle 429/5xx gracefully with exponential backoff and alerting on sustained errors.
- **Instrumentation**: Attach trace IDs to requests; emit structured logs to Supabase/Next telemetry.
- **Metrics**: Track JSON validity rate, latency percentiles, retry counts, proposal acceptance ratios.
- **Runbooks**: `docs/agents/OPERATIONS.md` covers deployment, scaling, incident handling.

## Testing & Evaluation

- **Unit Checks**: Validate proposal and scry JSON via zod; clamp out-of-range deltas.
- **Simulation**: Run tick sequences ensuring natural pressures dominate without decrees.
- **Skill Coverage**: Include runs with active skill modifiers, storehouse logistics, terrain variations.
- **UI Manual Pass**: Navigate `/play`, execute the full council loop (propose → scry → decide → tick).
- **Targets**: ≥99% JSON validity, <1% parse errors, deltas within recommended bounds.
- **Artifacts**: Capture prompt/response logs for regression review; store evaluation scripts under `docs/agents/EVALUATION.md` guidance.

## Extending the Council

- **Seasons & Omens**: Add seasonal flags/tables to vary tick pressures.
- **Alignments**: Guild or proposal traits influencing prompts and deltas.
- **New Actions**: Add structured `action_type`, `cost`, `requirements` fields with schema coverage.
- **Lore Expansions**: Update resource definitions, building catalog, and onboarding flow when adding systems.
- See `docs/agents/EXTENSIONS.md` for design patterns, pitfalls, and migration notes.

## Delivery Workflow & Required Checks

1. **Plan**: Draft architecture/prompt changes, update relevant docs (including this guide if scope touches agents).
2. **Implement**: Prefer small, reviewable commits; keep JSON schemas in sync with API changes.
3. **Validate**: Run `npm run lint`, `npm run test`, and `npm run build`. Capture output for PR descriptions.
4. **Review**: Provide a concise summary and explicit test list in the PR message.
5. **Deploy**: Follow runbooks; monitor metrics and logs for regressions.

_For documentation-only updates, explicitly state why automated checks were skipped and ensure link integrity._

## Reference Appendices

### Resources & Modifiers

- Primary resources: grain, coin, mana, favor, unrest, threat. Expanded: wood, planks.
- Logistics: Producers linked to a Storehouse via routes gain a modest output bonus.
- Terrain: Farms near water, lumber camps in dense forest, shrines near mountains receive adjacency boosts.
- Skills: Modify resource/building multipliers, worker upkeep, global output rates, trade-route coin yield, patrol upkeep costs, and building input consumption via `skill_modifiers`. Special abilities and category synergies feed these numbers.
- Category synergies: Economic+infrastructure (≥4 unlocks) boosts `trade_post`/`sawmill` output 5%; mystical+infrastructure (≥4) grants +5% mana and Storehouse output; military+social (≥3) reduces upkeep by 0.05 grain/worker; any legendary unlock nudges coin output +2%.

### Skill Special Abilities & Derived Multipliers

Skill nodes above common rarity may roll a special ability. The council API does **not** surface the ability directly—instead, its effects are folded into the `skill_modifiers` payload. Use the table below to interpret spikes and keep projections aligned with in-game math. Multipliers compound with other skill effects; defaults stem from the generator catalog.

| Ability (id) | Category | Default power | Derived effect(s) surfaced to agents |
| --- | --- | --- | --- |
| Golden Touch (`golden_touch`) | Economic | 2 | `building_multipliers.trade_post` and `.automation_workshop` × power (default ×2). |
| Market Insight (`market_insight`) | Economic | 1.5 | `route_coin_output_multiplier` × power (default ×1.5); `building_multipliers.trade_post` × (1 + 0.1·power) (default ×1.15). |
| Battle Fury (`battle_fury`) | Military | 0.5 | Reduces `upkeep_grain_per_worker_delta` by min(0.2, 0.2·power) (default −0.1). |
| Fortress Shield (`fortress_shield`) | Military | 0 | Forces `patrol_coin_upkeep_multiplier` to 0 (patrol routes free). |
| Mana Storm (`mana_storm`) | Mystical | 3 | `resource_multipliers.mana` × power (default ×3); `global_resource_output_multiplier` × (1 + 0.05·power) (default ×1.15). |
| Arcane Mastery (`arcane_mastery`) | Mystical | 1 | `resource_multipliers.mana` × (1 + 0.15·power) (default ×1.15); `building_multipliers.shrine` × (1 + 0.1·power) (default ×1.1). |
| Rapid Construction (`rapid_construction`) | Infrastructure | 1 | `resource_multipliers.wood` and `.planks` × (1 + 0.25·power) (default ×1.25); `global_building_output_multiplier` × (1 + 0.05·power) (default ×1.05). |
| Efficiency Boost (`efficiency_boost`) | Infrastructure | 1.5 | `global_building_output_multiplier` × (1 + 0.2·power) (default ×1.30). |
| Silver Tongue (`silver_tongue`) | Diplomatic | 2 | `resource_multipliers.favor` × power (default ×2). |
| Peace Treaty (`peace_treaty`) | Diplomatic | 1 | `upkeep_grain_per_worker_delta` −= 0.03·power (default −0.03); `building_input_multiplier` × max(0.6, 1 − 0.15·power) (default ×0.85). |
| Festival Spirit (`festival_spirit`) | Social | 1.25 | `global_resource_output_multiplier` × (1 + 0.08·power) (default ×1.10). |
| Unity Bond (`unity_bond`) | Social | 0.7 | `building_input_multiplier` × min(1, power) (default ×0.7); lowers `upkeep_grain_per_worker_delta` by 0.02·(1 − min(1, power)) (default ≈ −0.006). |

_Tip_: If multipliers fall below 1, interpret them as discounts (e.g., `building_input_multiplier` of 0.7 means 30% cheaper inputs). Always narrate the boon while still pairing upside with realistic trade-offs elsewhere in the proposal.

### Building Catalog (client-visible)

- **Farm**: Grain↑; water adjacency boosts output.
- **House**: Workers↑; consumes grain upkeep.
- **Council Hall**: Unlocks proposals/decrees.
- **Trade Post**: Converts grain→coin (routes and tariffs influence yield).
- **Automation Workshop**: Coin↑; consumes mana.
- **Shrine**: Favor↑; mountain adjacency boosts effect.
- **Lumber Camp**: Wood↑; forest adjacency boosts.
- **Sawmill**: Planks↑; consumes wood.
- **Storehouse**: Logistics hub; boosts connected producers.

### Onboarding Notes

- First-time flow grants free Farm, House, Council Hall.
- Minimal questline introduces Farm → House → Assign → Council → Proposals → Advance.
- Agents should assume steady-state rules post-onboarding; freebies handled client-side.

### Success Checklist (Quick Reference)

- Prompts: JSON-only, guild voice, include current resources/context.
- Models: Low temperature, bounded tokens, short context windows.
- Validation: Zod schemas pass; clamp resource floors after tick application.
- Safety: No secrets client-side; server routes handle writes.
- Ops: Timeouts, retries, minimal redacted logs.
- Lint/Test/Build: Run required commands before merging.

---

## User-provided custom instructions

Adhere to the best practices of the written languages. Always verify that your code works and is ready to be merged. Make sure to read the AGENTS.md and use the best practices and listen to the rules.

---

By following this guide, agents stay aligned with the game’s lore, operate safely, and deliver reliable council decisions. When in doubt, favor conservative actions, document assumptions, and update this guide so the entire guild of contributors benefits.
