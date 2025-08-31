# Arcane Dominion Agents Guide

> See [root AGENTS.md](../AGENTS.md) for repository-wide norms.

This guide aligns agents with the Arcane Dominion Tycoon design. It explains setup, architecture, and conventions to extend the AI-driven council.

## Setup

1) Requirements
- Node 18+
- Supabase project
- OpenAI API key

2) Environment (.env.local)
- SUPABASE_URL=
- SUPABASE_SERVICE_ROLE_KEY=
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- OPENAI_API_KEY=

3) Database
- Apply migrations to your Supabase project:
  - Via CLI: `supabase link` then `supabase db push --include-all`
  - Or run the SQL from `supabase/migrations/` in order using the Dashboard SQL editor
  - The latest migrations are idempotent and will create any missing core tables

## Architecture

- Next.js App Router (src/app)
- API routes:
  - GET /api/state -> fetch or create latest game state
  - POST /api/state/tick -> apply accepted proposals, progress cycle
  - POST /api/proposals/generate { guild } -> create proposals via AI
  - GET /api/proposals -> list proposals for current state
  - POST /api/proposals/[id]/scry -> forecast impact via AI, updates predicted_delta
  - POST /api/proposals/[id]/decide { accept|reject }

- Supabase helpers
  - src/lib/supabase/server.ts: server-side client (service role key)
  - src/lib/supabase/browser.ts: browser client (anon), prefer server for writes

- Frontend
  - /play: resources panel, council proposals, scry, accept/reject, advance cycle

## Design Canon (from README)
- Guilds: Wardens(defense), Alchemists(resources), Scribes(infrastructure), Stewards(policy)
- Resources: grain, coin, mana, favor, unrest, threat
- Loop: Observe -> Propose -> Scry -> Decree -> Execute -> Progress
- Tensions: wards decay, unrest and threat rise each cycle by default

## Agent Prompting Conventions
- Proposal generation
  - System: roleplay guild, produce JSON array [{ title, description, predicted_delta }]
  - Use the current resources to justify interventions; keep titles concise
- Scrying
  - System: conservative oracle; JSON { predicted_delta, risk_note }
  - Must parseable JSON (no prose outside JSON)

## Extending the Game
- Add Seasons and Omens
  - Extend game_state.resources with seasonal flags or a seasons table
  - Modify /api/state/tick natural adjustments based on season
- Add Alignments (Order/Wild/Shadow)
  - Per-proposal bias or per-guild personality table
  - Feed alignment cues into proposal prompts
- Add New Guild Actions
  - Add structured fields to proposals (action_type, cost, requirements)

## Testing
- Manual: use /play to create proposals, scry, accept/reject, and advance cycles
- Add guards: validate deltas with zod before persisting

## Security
- Never expose service role key to the browser
- Writes go through server routes

## Style
- Use Tailwind utility classes
- Keep UI readable, diegetic language, minimal chrome

## Workflows
- Create feature branch
- Update API and DB first, then wire UI
- Keep prompts deterministic and JSON-first
