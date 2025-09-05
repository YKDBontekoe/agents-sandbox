export interface GuildDef { description: string }

export const CORE_GUILDS: Record<string, GuildDef> = {
  Wardens: { description: 'defense' },
  Alchemists: { description: 'resources' },
  Scribes: { description: 'infra' },
  Stewards: { description: 'policy' },
}

export const GUILD_CATALOG: Record<string, GuildDef> = { ...CORE_GUILDS }

export type GuildId = keyof typeof GUILD_CATALOG
