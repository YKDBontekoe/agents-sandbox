# Security & Safety

Operational and design guidance to keep agents safe and least-privileged.

## Secrets & Access

- Service role key used only in `src/lib/supabase/server.ts`; never shipped to browser
- Browser uses anon client for reads only; all writes go through server API routes
- Environment variables loaded from `.env.local`; do not hardcode or log secrets

## Database Safety

- Enforce Row Level Security (RLS) in Supabase where applicable
- Server routes perform authorization checks if/when multi-user support is added
- Idempotency: do not reapply proposal deltas once marked `applied`

RLS checklist (when enabling multi-user):

- `game_state`: rows scoped by `auth.uid()`; service role bypasses RLS for server routes
- `proposals`: insert/update only by owner or server role; restrict status transitions
- Use `SECURITY DEFINER` RPCs sparingly; prefer API routes with service role

## Prompt & Tool Safety

- Constrain outputs with strict JSON schemas; clamp numeric ranges as needed
- Refuse requests outside game canon (violence beyond tone, meta-actions, self-modification)
- Tool allowlist: agents only read state and write proposals via routes, never arbitrary IO

Refusal patterns:

- Non-canon actions → respond with empty JSON (`[]`) or `risk_note: "out_of_scope"`
- Missing inputs → return minimal safe JSON (empty array/object) and log reason

## Logging & Privacy

- Structured logs with request IDs; redact secrets and PII
- Store prompts/responses only if needed for debugging; avoid long-term retention in prod

Redaction suggestions: redact keys matching `/key|token|password|secret/i`; avoid logging full resource payloads when unnecessary.

## Abuse Handling

- Rate-limit API routes; exponential backoff on provider rate limits
- Validate inputs to prevent injection or resource exhaustion (overlong titles/descriptions)
