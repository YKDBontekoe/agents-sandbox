# Configuration

The configuration module lives at `packages/infrastructure/config` and centralizes all environment-based settings.

## Loading Order

1. **Defaults** – sensible values defined in code.
2. **Environment variables** – override defaults when present.
3. **Overrides** – optional values passed to `loadConfig` for tests.

The result is registered in a lightweight container and exported as `config`. `publicConfig` exposes the browser-safe subset.

## Defaults

| Key | Default |
| --- | --- |
| `nodeEnv` | `development` |
| `vercelEnv` | `local` |
| `logLevel` | `debug` when `nodeEnv` is `development`, otherwise `error` |
| `nextPublicOfflineMode` | `false` |
| `nextPublicDisableRealtime` | `false` |
| `proposalRateLimit` | `5` |

Required keys without defaults:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

Optional keys:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_LOG_LEVEL`
- `VERCEL_ENV`
- `NEXT_PUBLIC_OFFLINE_MODE`
- `NEXT_PUBLIC_DISABLE_REALTIME`
- `PROPOSAL_RATE_LIMIT`
