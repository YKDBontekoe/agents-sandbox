import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import type { GuildAgent } from './types'

const agents: Record<string, GuildAgent> = {}

async function loadPlugins() {
  if (Object.keys(agents).length) return
  const pluginsDir = path.join(process.cwd(), 'src', 'domain', 'guilds', 'plugins')
  if (!fs.existsSync(pluginsDir)) return
  const files = fs
    .readdirSync(pluginsDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
  for (const file of files) {
    const full = path.join(pluginsDir, file)
    const mod = await import(pathToFileURL(full).href)
    const agent: GuildAgent = mod.default || mod
    const name: string = mod.guild || mod.name || path.basename(file, path.extname(file))
    if (agent) agents[name] = agent
  }
}

export async function getGuildAgent(name: string): Promise<GuildAgent | undefined> {
  await loadPlugins()
  return agents[name]
}

export async function listGuildAgents(): Promise<string[]> {
  await loadPlugins()
  return Object.keys(agents)
}
