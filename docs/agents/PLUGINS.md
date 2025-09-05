# Guild Plugins

Arcane Dominion supports pluggable guild agents. Each guild lives in `src/domain/guilds/plugins` and exports a default object matching the `GuildAgent` interface:

```ts
export interface GuildAgent {
  propose(state: GameState): Promise<ProposalDraft[]>
  scry(proposal: ProposalDraft, state: GameState): Promise<ScryResult>
}
```

The registry at `src/domain/guilds/registry.ts` loads all plugin files at runtime and exposes them by guild name. API routes resolve guild logic through this registry, allowing new guild modules to be added without touching core code.

## Creating Third-Party Agents

1. Add a new file under `src/domain/guilds/plugins` (for example `myguild.ts`).
2. Export a `guild` name and a default `GuildAgent` implementation:

```ts
import type { GuildAgent } from '../types'

export const guild = 'MyGuild'

const agent: GuildAgent = {
  async propose(state) {
    return [/* ... */]
  },
  async scry(proposal, state) {
    return { predicted_delta: {}, risk_note: '' }
  },
}

export default agent
```

3. The registry automatically discovers the file. No additional wiring is required.
4. Agents may call external services (e.g., OpenAI) or use deterministic logic.

See `wardens.ts`, `alchemists.ts`, `scribes.ts`, and `stewards.ts` for reference implementations.
