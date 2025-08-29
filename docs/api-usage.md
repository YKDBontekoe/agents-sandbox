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
## Streaming Responses

Agents support Server-Sent Events for real-time token streaming. Open a stream like:

```bash
curl -N "http://localhost:3000/api/agents/<id>/stream?messages=%5B%7B%5C"role%5C":%5C"user%5C",%5C"content%5C":%5C"Hello%5C"%7D%5D"
```

The endpoint emits `data:` lines for each token and ends with `data: [DONE]`.
