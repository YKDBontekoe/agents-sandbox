import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

export interface Plugin {
  id: string;
  name: string;
  onLoad?: () => void | Promise<void>;
  onEnable?: () => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  enabled?: boolean;
}

const registry = new Map<string, Plugin>();

export function registerPlugin(plugin: Plugin): void {
  if (registry.has(plugin.id)) {
    throw new Error(`Plugin with id "${plugin.id}" already registered`);
  }

  const entry = { ...plugin, enabled: plugin.enabled ?? false };
  registry.set(plugin.id, entry);
  plugin.onLoad?.();
}

export function getPlugins(): Plugin[] {
  return Array.from(registry.values());
}

export async function enablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && !plugin.enabled) {
    plugin.enabled = true;
    await plugin.onEnable?.();
  }
}

export async function disablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && plugin.enabled) {
    plugin.enabled = false;
    await plugin.onDisable?.();
  }
}

export async function loadPlugins(dir = path.join(process.cwd(), 'plugins')): Promise<void> {
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'));

  for (const file of files) {
    const url = pathToFileURL(path.join(dir, file)).href;
    const mod = await import(url);
    const plugin: Plugin | undefined = mod.default;
    if (plugin) {
      registerPlugin(plugin);
    }
  }
}

// CLI execution: list loaded plugins
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadPlugins().then(() => {
    const loaded = getPlugins()
      .map((p) => `${p.id}${p.enabled ? ' (enabled)' : ''}`)
      .join(', ');
    console.log(`Loaded plugins: ${loaded || 'none'}`);
  });
}
