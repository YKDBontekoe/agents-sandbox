import { loadPluginsSync, type GuildAgentSpec } from '@/domain/plugins'

export interface GuildDef extends GuildAgentSpec {}

export const CORE_GUILDS: Record<string, GuildDef> = {
  Wardens: { description: 'defense' },
  Alchemists: { description: 'resources' },
  Scribes: { description: 'infra' },
  Stewards: { description: 'policy' },
}

const plugins = typeof window === 'undefined' ? loadPluginsSync() : []
const modGuilds: Record<string, GuildDef> = {}
for (const p of plugins) {
  Object.assign(modGuilds, p.guildAgents)
}

export const GUILD_CATALOG: Record<string, GuildDef> = {
  ...CORE_GUILDS,
  ...modGuilds,
}

export type GuildId = keyof typeof GUILD_CATALOG
