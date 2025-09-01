# Agent Architecture

This document explains the agent loop, data flow, and the boundaries between the model, API routes, and database. It complements AGENTS.md.

## Agent Loop

- Observe: fetch latest `game_state` and active `proposals`.
- Propose: guild agent generates 1–3 proposals (strict JSON).
- Scry: oracle forecasts conservative `predicted_delta` per proposal.
- Decree: steward (player) accepts/rejects proposals.
- Execute & Progress: tick applies accepted deltas and natural pressures.

## Data Flow

- `POST /api/proposals/generate`:
  - Inputs: `{ guild?: string }`
  - Reads: latest `game_state`
  - AI: proposal drafting; strict JSON array
  - Writes: rows in `proposals` with `status = 'pending'`

- `POST /api/proposals/[id]/scry`:
  - Inputs: `{}`
  - Reads: `proposals` with joined `game_state`
  - AI: conservative forecast; strict JSON object
  - Writes: `predicted_delta` onto proposal

- `POST /api/state/tick`:
  - Reads: accepted proposals for latest state
  - Applies: additive deltas; clamps to >= 0; applies natural pressures
  - Writes: updated `game_state`; marks proposals `applied`

## Contracts & Schemas

- Proposal item: `{ title: string, description: string, predicted_delta: Record<string, number> }`
- Scry result: `{ predicted_delta: Record<string, number>, risk_note: string }`
- Enforced via zod: see `src/app/api/proposals/generate/route.ts` and `src/app/api/proposals/[id]/scry/route.ts`.

## Deterministic Fallbacks

When `OPENAI_API_KEY` is absent, routes use rule-based heuristics to keep the game playable. This ensures local dev and demo flows without external dependencies.

## Error Handling

- Parse discipline: extract and parse only the JSON region; reject on failure
- Validation: reject bodies and AI outputs that fail zod schemas
- Idempotency: do not re-apply deltas; proposals marked `applied` after tick
- Clamping: resources are non-negative; clamp after each application

## Prompt Integration

- System prompts are concise and imperative; user prompts include current resources
- Prefer JSON mode / JSON schema when available in the SDK; otherwise, repair strategy:
  1) Ask for JSON-only
  2) Extract JSON region
  3) Validate against zod
  4) Optionally re-ask with the validation error summary

## Model & Settings

- Model class: OpenAI via `@ai-sdk/openai`
- Defaults: small-fast model for low latency; low temperature for determinism
- Token budgets: bound by prompt brevity; delta schemas are compact

## Repository Structure (Agent-Focused)

```
src/
  app/
    api/
      state/
        route.ts           # GET /api/state
      state/tick/
        route.ts           # POST /api/state/tick
      proposals/
        route.ts           # GET /api/proposals
        generate/
          route.ts         # POST /api/proposals/generate
        [id]/
          scry/
            route.ts       # POST /api/proposals/[id]/scry
          decide/
            route.ts       # POST /api/proposals/[id]/decide
  lib/
    supabase/
      server.ts            # service role client (server-only)
      browser.ts           # anon client (browser)
docs/
  agents/                  # deep agent documentation
supabase/
  migrations/              # SQL migrations for game_state, proposals
```

## Lifecycle Guarantees

- Single-writer: API routes own all writes; browser reads only
- Apply-once: `accepted` proposals get applied in the next tick and then marked `applied`
- Non-negative: resources are clamped to >= 0 after each tick
- Time-bounded: AI calls use strict timeouts and limited retries

## Failure Modes & Responses

- AI unconfigured: rule-based fallbacks generate/scry; log fallback path
- Parse/Schema error: return 400 with validation detail; do not persist invalid content
- Rate limited: retry with jitter; surface 429 response after max attempts
- DB contention: prefer last-write-wins on proposals; tick operates on latest state only
