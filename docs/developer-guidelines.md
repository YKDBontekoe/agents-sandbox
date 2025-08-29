# Developer Guidelines

## Coding Style

- Use TypeScript for all source files.
- Follow the project's ESLint configuration.
- Prefer functional components and hooks in React.

## Testing

- Run `npm run lint` and ensure no warnings remain.
- Add unit tests for new features when a test framework is available.
- Manual testing of critical paths is encouraged.

## Documentation

Update both this `docs/` directory and the root `README.md` whenever APIs or behavior change to keep documentation synchronized.

## Analytics

 Metrics collected by `src/lib/analytics/index.ts` are persisted to `data/analytics-metrics.json`.
The module flushes metrics to disk after each update and reloads them on startup so
counts survive server restarts. A real-time dashboard is available at `/analytics` and
refreshes automatically on `analytics-updated` events.
