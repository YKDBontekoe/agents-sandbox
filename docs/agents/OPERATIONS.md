# Operations

Runbooks and best practices for reliable, cost-aware agent operations.

## Reliability

- Timeouts: bound all AI calls; fail fast and surface actionable errors
- Retries: limited retries with jitter for transient errors (network, 429)
- Backpressure: queue generation/scry requests if needed to avoid burst failures

Suggested values:

- Timeouts: 10s (generate), 6s (scry)
- Retries: up to 2; backoff 250ms then 1s
- Concurrency: limit to CPU cores or provider QPS budget

## Observability

- Add request/trace IDs through the stack; include in logs and responses where safe
- Log: route name, model, prompt hash, token usage, latency, outcome (ok/parse_error)
- Redact inputs/outputs; enable full-log sampling only in debug environments

Minimal log fields:

- `request_id`, `route`, `model`, `temperature`, `tokens_in`, `tokens_out`, `latency_ms`, `result`: ok|parse_error|schema_error|timeout|rate_limited

## Cost Controls

- Use small-fast models where acceptable (proposal/scry are short)
- Cap max tokens per call; keep prompts minimal and grounded
- Cache stable generations where appropriate (e.g., rule-based fallbacks)

Provider protections:

- Handle 429 with backoff; respect `Retry-After`
- Prefer short prompts; keep examples minimal or omitted

## Model Strategy

- Default: JSON/schema-capable model for higher validity
- Canary: ship prompt/model updates behind a flag; compare validity and resource error rates
- Rollback: keep last-known-good prompt+settings version ready to restore
