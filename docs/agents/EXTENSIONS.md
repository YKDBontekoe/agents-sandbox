# Extensions

Patterns to extend the game with seasons, alignments, and structured actions.

## Seasons & Omens

- Data: extend `game_state.resources` with `season` or add `seasons` table
- Logic: adjust natural pressures in `/api/state/tick` by season
- Prompts: include `season` and active `omens` to influence proposals and scry

## Alignments (Order / Wild / Shadow)

- Data: per-guild or per-proposal `alignment` field
- Prompts: alignment cues to bias style and risk appetite
- Safety: ensure deltas remain bounded; avoid degenerate Shadow exploits

## New Actions

- Schema: add `action_type`, `cost`, `requirements`, `duration` to proposals
- UI: render icons/explanations; validate requirements client-side
- Tick: apply multi-tick effects when `duration > 1`

Example proposal shape:

```
{
  "title": "Reinforce Gatehouse",
  "description": "Steel bands and warded bolts for the main gate.",
  "action_type": "fortification",
  "cost": { "coin": 12, "mana": 3 },
  "requirements": ["mana>=3", "coin>=12"],
  "duration": 2,
  "predicted_delta": { "threat": -4, "unrest": -1 }
}
```

## Migration Strategy

- Write idempotent migrations; backfill defaults for new fields
- Gate new behaviors behind flags until UI and prompts are updated

SQL sketch:

```
alter table proposals add column if not exists action_type text;
alter table proposals add column if not exists cost jsonb default '{}'::jsonb;
alter table proposals add column if not exists requirements jsonb default '[]'::jsonb;
alter table proposals add column if not exists duration int default 1;
```
