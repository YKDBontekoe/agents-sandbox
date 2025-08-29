# API Usage

Agents Sandbox exposes REST endpoints to interact with agents and plugins.

## Example Request

```bash
curl -X POST http://localhost:3000/api/agents -d '{"prompt":"Hello"}'
```

Responses return JSON payloads describing agent output or errors.

## Authentication

API routes are currently unsecured and intended for local development only. Add authentication middleware before deploying to production.

## Marketplace

List marketplace agents with optional search and category filters:

```bash
curl \
  'http://localhost:3000/api/marketplace/agents?q=assistant&category=utilities'
```

Rate an agent and automatically update its average rating:

```bash
curl -X PUT \
  http://localhost:3000/api/marketplace/agents/<id>/rating \
  -H 'Content-Type: application/json' \
  -d '{"rating":5}'
```
