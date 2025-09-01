# Evaluation & Testing

Approaches to ensure agents remain correct, safe, and fun.

## Contracts First

- Validate all AI outputs against zod schemas
- Reject on failure; never coerce into DB without validation

Metrics to track:

- JSON validity rate (goal ≥ 99%)
- Schema pass rate (goal ≥ 99%)
- Parse error rate (goal < 1%)
- Average delta magnitude per resource (watch for drift)

## Unit Tests

- Schema: fuzz test `predicted_delta` keys/values (numbers only, reasonable ranges)
- Tick: verify natural pressures apply when no proposals are accepted
- Clamp: ensure resources never drop below zero

Edge cases:

- Empty proposal arrays
- Unknown resource keys in `predicted_delta` (ignore or safely add)
- Large negative deltas; verify clamps and stability

## Golden Scenarios

- Create small fixtures: game states + expected plausible proposals/scries
- Assert: JSON validity rate ≥ 99%; deltas within allowed bounds

Examples to include:

- Low coin → proposals bias toward frugal options
- High threat → Wardens favor defense over festivals

## Simulation

- Run deterministic sequences (no AI) to test economic balance over N ticks
- Introduce scripted proposal deltas; verify stability and recovery behaviors

Stability checks:

- With no accepted proposals, resources trend under pressures as expected
- With balanced acceptances, economy does not explode or crash rapidly

## Manual QA

- `/play`: propose → scry → decide → tick
- Check tone, JSON validity, resource motions feel plausible
