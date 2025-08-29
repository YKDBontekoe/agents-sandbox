# API Usage

Agents Sandbox exposes REST endpoints to interact with agents and plugins.

## Example Request

```bash
curl -X POST http://localhost:3000/api/agents -d '{"prompt":"Hello"}'
```

Responses return JSON payloads describing agent output or errors.

## Authentication

API routes are currently unsecured and intended for local development only. Add authentication middleware before deploying to production.
