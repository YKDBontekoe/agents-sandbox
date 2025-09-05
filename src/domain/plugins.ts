import 'server-only'

// Plugin loader is server-only; modules are required lazily to avoid bundling issues

export interface SimBuildingType {
  id: string
  name: string
  cost: Record<string, number>
  inputs: Record<string, number>
  outputs: Record<string, number>
  workCapacity?: number
  maxLevel?: number
}

export interface ResourceSpec {
  icon: unknown
  color: string
}

export interface GuildAgentSpec {
  description: string
}

export interface Plugin {
  buildings?: Record<string, SimBuildingType>
  resources?: Record<string, ResourceSpec>
  guildAgents?: Record<string, GuildAgentSpec>
}

let cachedPlugins: Plugin[] | null = null

export function loadPluginsSync(modsDir?: string): Plugin[] {
  if (cachedPlugins) return cachedPlugins
  if (typeof window !== 'undefined') {
    cachedPlugins = []
    return cachedPlugins
  }
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const { createRequire } = require('module') as typeof import('module')
  const dir = modsDir ?? path.resolve(process.cwd(), 'mods')
  const list: Plugin[] = []
  if (!fs.existsSync(dir)) {
    cachedPlugins = []
    return cachedPlugins
  }
  const requireMod = createRequire(import.meta.url)
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file)
    if (!fs.statSync(full).isFile()) continue
    if (!/\.(cjs|js|mjs)$/i.test(file)) continue
    try {
      const mod = requireMod(full)
      const plugin: Plugin = mod.default || mod
      if (plugin) list.push(plugin)
    } catch (err) {
      console.error('Failed to load plugin', file, err)
    }
  }
  cachedPlugins = list
  return list
}
