# Arcane Dominion Agents Guide

_Last updated: 2025-09-15. Keep this guide evolving alongside the game; when you change systems or knowledge, update the relevant sections and cross-links._

This guide is the canonical reference for building, extending, and operating the Arcane Dominion Tycoon agent council. It consolidates domain lore, architecture, prompting conventions, operations runbooks, and delivery workflows so every contributor—human or AI—can work efficiently and safely.

Related deep dives live in `docs/agents/` (ARCHITECTURE, PROMPTS, SECURITY, OPERATIONS, EVALUATION, EXTENSIONS, CONTRIBUTING) and `docs/architecture/`. Decision records are in `docs/adr/`.

## Table of Contents

1. [World & Player Pillars](#world--player-pillars)
2. [Quick Setup & Environment](#quick-setup--environment)
3. [Systems Overview](#systems-overview)
4. [Repository Layout & Rationale](#repository-layout--rationale)
    - [Root Workspace](#root-workspace)
    - [src Application Core](#src-application-core)
    - [Packages Modular Libraries](#packages-modular-libraries)
    - [Apps Feature Surfaces](#apps-feature-surfaces)
    - [Docs & Knowledge Base](#docs--knowledge-base)
    - [Supabase & Infra](#supabase--infra)
5. [Monorepo Tooling & Configuration](#monorepo-tooling--configuration)
6. [Data & API Contracts](#data--api-contracts)
7. [Agent Responsibilities & Principles](#agent-responsibilities--principles)
8. [Prompting Standards](#prompting-standards)
9. [Efficiency Playbook](#efficiency-playbook)
10. [Safety & Security](#safety--security)
11. [Operations & Observability](#operations--observability)
12. [Testing & Evaluation](#testing--evaluation)
13. [Extending the Council](#extending-the-council)
14. [Historical Context & Key Refactors](#historical-context--key-refactors)
15. [Delivery Workflow & Required Checks](#delivery-workflow--required-checks)
16. [Reference Appendices](#reference-appendices)

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

## Repository Layout & Rationale

Arcane Dominion runs as a TypeScript-first Next.js monorepo. The layout deliberately isolates the playable client, headless
simulation engine, infrastructure adapters, and knowledge base so that each concern can evolve and be tested independently
without breaking the agent workflows described elsewhere in this guide.

### Root Workspace

- `package.json` / `package-lock.json`: Single Next.js workspace exposing `dev`, `build`, `lint`, and `test` scripts. Keep these
  at the repository root so CI and local tooling share the same entrypoint.
- `next.config.ts`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.mjs`: Centralized build and design configuration.
  The Next.js config temporarily disables Turbopack to avoid HMR regressions while still allowing production builds if linting
  fails (lint must be run separately). Vitest mirrors our path aliases so simulation code remains deterministic under Node.
- `tsconfig.json`: Strict TypeScript settings with bundler-style module resolution and aliases for `@`, `@engine`,
  `@arcane/ui`, `@arcane/infrastructure`, and `@/utils/performance` so imports stay stable as files move.
- `eslint.config.mjs`: Flat-config baseline extending `next/core-web-vitals` and `next/typescript` while permitting the
  occasional `any` in simulation math.
- `public/`: Static assets (SVG icons, sprite atlases) shipped directly by Next.js.
- `scripts/`: Operational helpers such as `migrate-supabase.sh`, which runs migrations against a provided `DATABASE_URL`.
- `infra/`: Runbooks for database migrations that complement the Supabase folder described below.
- High-level workspaces: `src/` (application), `packages/` (shared libraries), `apps/` (feature playgrounds), `docs/`
  (knowledge base), and `supabase/` (database schema). These remain at the root so editors and CLI tooling can resolve paths
  without additional configuration.

### src Application Core

- `app/`: The App Router front door. `layout.tsx` wires providers; `page.tsx` boots the `/play` experience; `play/` contains the
  interactive client (`PlayClient`, `PlayPageInternal`, and supporting utilities); `debug/` hosts instrumentation views; and
  `api/` holds the route handlers that orchestrate Supabase, the simulation engine, and AI agents (generate, scry, decide, tick,
  and map routes).
- `components/`: React building blocks. The `game/` subtree layers PIXI-based rendering (grid, buildings, citizens, seasonal
  effects), HUD panels, accessibility helpers, and simulation overlays. `SettingsPanel.tsx` at the root is shared between the
  HUD and settings surfaces.
- `domain/`: Repository interfaces for proposals and game state. These abstract Supabase so tests and future storage backends
  can plug in via dependency injection.
- `hooks/`: Shared React hooks for adaptive quality scaling, PIXI lifecycle management, deterministic ID generation, and player
  preference hydration.
- `infrastructure/`: Runtime configuration helpers that translate environment variables into typed flags consumed by the app and
  agents.
- `lib/`: Cross-cutting utilities, including Supabase client factories (`lib/supabase`), PIXI helpers (`lib/pixi`), logging,
  building catalogs, and icon registries. Unit tests live under `lib/__tests__`.
- `middleware/`: API middleware such as `rateLimit.ts` that guards server routes.
- `state/`: Zustand store composition, slice definitions (`game`, `notifications`, `session`), persistence helpers, and store
  tests.
- `styles/`: Global CSS tokens (`design-tokens.css`) and animation helpers (`animations.css`) that Tailwind consumes.
- `pages/`: Legacy `hud-demo` page retained for regression checks while the production experience runs entirely through the App
  Router.

### Packages Modular Libraries

- `engine`: Deterministic simulation library executed server-side. The September 2025 refactors (`aeae37a`, `57e45cf`) split the
  monolithic engine into modular city and worker services (`buildingManager`, `citizenManager`, `laborMarketService`, etc.) with
  exhaustive tests under `src/simulation/**`.
- `infrastructure`: Supabase-backed implementations of the domain repositories plus a `unit-of-work` helper so API routes can
  manage transactions consistently.
- `ui`: Cross-application UI primitives (action buttons, resource icons, settings flyouts) with their own Tailwind theme to keep
  design tokens in sync across surfaces.
- `utils/performance`: Small helpers (adaptive quality, throttle/debounce, RAF coordination) consumed by the PIXI renderer and
  hooks.
- `assembly/`: Experimental AssemblyScript modules that ship with the engine but are excluded from the TypeScript build via
  `tsconfig.json`.

### Apps Feature Surfaces

- `apps/web/features`: Internal playgrounds for rendering experiments (buildings, effects, ley lines, routes). Commit `b7967ec`
  introduced the leyline inspector here before merging the refined experience into `src/app/play`, so this directory remains a
  safe staging ground for prototypes that may later graduate into the main client.

### Docs & Knowledge Base

- `docs/agents`: Deep dives for architecture, prompts, security, operations, evaluation, and extensions. Keep this guide and
  those documents in lockstep whenever mechanics or prompting strategies change.
- `docs/architecture`: System context and package diagrams (Mermaid) referenced in ADR-0001.
- `docs/adr`: Architecture Decision Records, starting with `[ADR-0001]` that formalized this documentation process. Add new
  ADRs whenever you make non-trivial structural changes.

### Supabase & Infra

- `supabase/config.toml`: Supabase CLI configuration for local linking and migrations.
- `supabase/migrations`: Timestamped SQL migrations that define the canonical schema. Follow the naming convention outlined in
  `infra/README.md` and apply them via `supabase db push --include-all` or the migration script.
- `supabase/functions`: Placeholder for edge functions/triggers. Keep empty files removed to avoid accidental deployments.
- `infra/README.md`: Operational guidance for database migrations, including conflict resolution steps.
- `scripts/migrate-supabase.sh`: Convenience wrapper to run migrations against a Postgres `DATABASE_URL`.

## Monorepo Tooling & Configuration

- **Package scripts**: `npm run dev` (Next.js with PIXI layers), `npm run build`, `npm run lint`, and `npm run test`. Linting is
  enforced separately from `next build`, so always run it before opening a PR.
- **TypeScript**: `tsconfig.json` enforces `strict` mode, skips library checks for speed, and aligns path aliases with the
  package structure so both Next.js and Vitest resolve shared code consistently.
- **Vitest**: `vitest.config.ts` mirrors the alias map and defaults to the Node environment, switching to `jsdom` for UI store
  tests (`src/state/**`) to keep browser-only APIs available where needed.
- **ESLint**: Flat config extends Next best practices and allows limited `any` usage for simulation math. Respect lint output in
  CI and fix violations locally.
- **Next.js build**: `next.config.ts` disables Turbopack while its module boundary bugs are triaged and sets `ignoreDuringBuilds`
  so lint failures do not block `next build`. Do not rely on that bypass—run lint/tests yourself.
- **Styling pipeline**: Tailwind consumes tokens from `src/styles/design-tokens.css`; PostCSS with autoprefixer keeps generated
  CSS compatible across browsers. Update both when introducing new design tokens.
- **PIXI/WebGL setup**: Rendering layers use `@pixi/react` and `pixi-viewport`. When touching these, validate performance with
  the adaptive quality utilities in `packages/utils/performance`.
- **Supabase CLI**: Use `supabase link` to bind a project, then `supabase db push --include-all` or `scripts/migrate-supabase.sh`
  to apply migrations. Secrets stay in `.env.local` and are never committed.
- **Engine packaging**: `packages/engine/package.json` provides `tsup` builds for both CJS and ESM plus an optional
  `build:wasm` script for the AssemblyScript experiments. Keep generated artifacts out of source control.

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

## Historical Context & Key Refactors

Understanding how the repository has evolved helps you respect existing seams when proposing new structures:

- **2025-01-12 – ADR-0001**: Established the architecture documentation suite under `docs/architecture` and formalized the ADR
  template in `docs/adr/`, giving us a home for structural decisions that materially affect agents and simulation boundaries.
- **2025-09-16 – `b7967ec` Add leyline drawing controls and inspector**: Landed the leyline workflow in `apps/web/features` and
  `src/app/play`, codifying the pattern of using `apps/` as a safe proving ground for complex HUD features before they reach the
  main game.
- **2025-09-16 – `57e45cf` Refactor worker simulation into modular services**: Split the worker systems into dedicated services
  under `packages/engine/src/simulation/workers/**`, which is why new worker logic should live beside `laborMarketService` and
  ship with matching tests.
- **2025-09-16 – `aeae37a` Refactor city simulation into modular services**: Broke the city simulation apart into
  `buildingManager`, `citizenManager`, `eventScheduler`, and `metricsService`, reinforcing the expectation that future engine
  work favors focused services over monoliths.
- **2025-09-16 – `ecad943` Move world generation utilities into engine**: Centralized noise/biome utilities inside
  `packages/engine/src/world` and deleted the redundant `src/lib/world` module, so any terrain updates must go through the
  engine package to stay deterministic.
- **Monorepo realignment artifacts**: `package.json.root.bak` and `package-lock.json.root.bak` document the previous nested
  workspace that wrapped an `arcane-dominion/` folder. They remain for historical reference; new tooling should target the
  flattened layout described above.

Use `git log -- <path>` to review these refactors before touching a directory—they explain why tests, docs, and abstractions sit
where they do.

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
