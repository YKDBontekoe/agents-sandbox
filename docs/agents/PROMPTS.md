# Prompting Guide

Standards, examples, and guardrails for Arcane Dominion agents.

## Principles

- JSON-only outputs; no prose outside JSON
- Short, specific instructions; avoid open-ended creative phrasing
- Ground in current resources and guild focus to reduce drift
- Conservative forecasts; avoid exaggerated positive deltas
- Determinism: use low temperature; prefer JSON/schema mode when available

## Schemas

- Proposal item (TypeScript): `{ title: string; description: string; predicted_delta: Record<string, number> }`
- Scry output (TypeScript): `{ predicted_delta: Record<string, number>; risk_note: string }`

JSON Schema (proposal array):

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["title", "description", "predicted_delta"],
    "properties": {
      "title": { "type": "string", "minLength": 1, "maxLength": 120 },
      "description": { "type": "string", "minLength": 1, "maxLength": 300 },
      "predicted_delta": {
        "type": "object",
        "additionalProperties": { "type": "number" }
      }
    },
    "additionalProperties": false
  },
  "minItems": 1,
  "maxItems": 3
}
```

JSON Schema (scry output):

```
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["predicted_delta", "risk_note"],
  "properties": {
    "predicted_delta": {
      "type": "object",
      "additionalProperties": { "type": "number" }
    },
    "risk_note": { "type": "string", "minLength": 1, "maxLength": 140 }
  },
  "additionalProperties": false
}
```

## Proposal Generation

System:

"You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas. Resources: grain, coin, mana, favor, unrest, threat. Guilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy). Return JSON array, each item: { title, description, predicted_delta: {resource:number,...} }. Output JSON only."

User (example):

"Current cycle: 7\nResources: {\"grain\": 520, \"coin\": 38, \"mana\": 22, \"favor\": 6, \"unrest\": 5, \"threat\": 8}\nGuild: Wardens\nGenerate 2 proposals rooted in this guild focus and the game's tone."

Notes:

- Keep titles under ~60 chars; descriptions 1–2 short sentences
- Deltas should be plausible and internally consistent (costs where benefits accrue)
- If inputs are missing, refuse with an empty JSON array `[]`

Good example (Wardens):

```
[
  {
    "title": "Fortify the Outer Walls",
    "description": "Repair battlements and add sentries along weak sections.",
    "predicted_delta": { "threat": -3, "unrest": -1, "coin": -10 }
  },
  {
    "title": "Patrol the Wilds",
    "description": "Sweep nearby forests for raiders and beasts.",
    "predicted_delta": { "threat": -2, "favor": 1, "coin": -5 }
  }
]
```

## Scrying

System:

"You are a scrying oracle. Given a proposal and current resources, forecast likely deltas in a conservative, numeric way. Return JSON: { predicted_delta: {resource:number,...}, risk_note: string }. Output JSON only."

User (example):

"Resources: {\"grain\": 520, \"coin\": 38, \"mana\": 22, \"favor\": 6, \"unrest\": 5, \"threat\": 8}\nProposal: Fortify the Outer Walls - Repair battlements and station extra sentries along the perimeter."

Notes:

- Prefer small magnitude estimates; include negative costs for coin/mana where applicable
- `risk_note` is a single sentence highlighting uncertainty or dependencies

Good example (Scry):

```
{
  "predicted_delta": { "threat": -2, "unrest": -1, "coin": -8 },
  "risk_note": "Effect varies with garrison morale and material quality."
}
```

## JSON Mode & Repair Strategy

- Prefer enabling JSON output with schema (if SDK supports `response_format` / `jsonSchema`)
- If free-form: extract the first top-level JSON region, then validate against zod
- On validation error, optionally re-ask: "Repair to match schema. Error: <zod message>"

SDK tip (conceptual): prefer schema-bound calls when available, else set `response_format: { type: "json_object" }` and keep prompts terse.

## Few-Shot Patterns (optional)

- Include 1–2 minimal good examples per guild, matching the exact JSON shape
- Avoid examples that inflate magnitudes or include narrative text

## Refusals

- If asked for non-guild actions (e.g., assassination, meta-text), return `[]` for generate or `{ "predicted_delta": {}, "risk_note": "out_of_scope" }` for scry.

Soft bounds guidance: grain ±500, coin ±100, mana ±50, favor ±10, unrest ±10, threat ±10. Prefer smaller magnitudes unless strongly justified.
