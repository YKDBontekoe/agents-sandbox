# Engine Package Agent Guide

When modifying code in this package:

- Ensure TypeScript code has no `any` types; prefer explicit interfaces.
- Run unit tests: `npm test`
- Run ESLint on the paths you change, e.g., `npx eslint packages/engine/src/simulation/events`
- If repository-wide linting fails due to unrelated issues, ensure the paths you modified pass ESLint.
