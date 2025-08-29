import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

export interface Plugin {
  id: string;
  name: string;
  onLoad?: (options?: Record<string, unknown>) => void | Promise<void>;
  onEnable?: (options?: Record<string, unknown>) => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  enabled?: boolean;
  options?: Record<string, unknown>;
  warning?: string;
  error?: string;
}

interface PluginState {
  enabled: boolean;
  options?: Record<string, unknown>;
}

const registry = new Map<string, Plugin>();
let state: Record<string, PluginState> = {};
let stateFilePath = path.join(process.cwd(), 'plugins', 'plugin-state.json');

function loadState(): void {
  if (fs.existsSync(stateFilePath)) {
    try {
      state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    } catch {
      state = {};
    }
  } else {
    state = {};
  }
}

function saveState(): void {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

export async function registerPlugin(plugin: Plugin): Promise<void> {
  if (registry.has(plugin.id)) {
    throw new Error(`Plugin with id "${plugin.id}" already registered`);
  }

  const persisted = state[plugin.id];
  const entry: Plugin = {
    ...plugin,
    enabled: persisted?.enabled ?? plugin.enabled ?? false,
    options: { ...plugin.options, ...persisted?.options },
  };

  registry.set(plugin.id, entry);
  try {
    await plugin.onLoad?.(entry.options);
  } catch (err) {
    entry.error = String(err);
  }
  if (entry.enabled) {
    await plugin.onEnable?.(entry.options);
  }
}

export function getPlugins(): Plugin[] {
  return Array.from(registry.values());
}

export async function enablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && !plugin.enabled) {
    plugin.enabled = true;
    await plugin.onEnable?.(plugin.options);
    state[id] = { ...state[id], enabled: true, options: plugin.options };
    saveState();
  }
}

export async function disablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && plugin.enabled) {
    plugin.enabled = false;
    await plugin.onDisable?.();
    state[id] = { ...state[id], enabled: false, options: plugin.options };
    saveState();
  }
}

export async function updatePluginOptions(
  id: string,
  options: Record<string, unknown>,
): Promise<void> {
  const plugin = registry.get(id);
  if (plugin) {
    plugin.options = options;
    state[id] = { ...state[id], enabled: plugin.enabled ?? false, options };
    saveState();
  }
}

export async function loadPlugins(dir = path.join(process.cwd(), 'plugins')): Promise<void> {
  registry.clear();
  stateFilePath = path.join(dir, 'plugin-state.json');
  loadState();
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'));

  for (const file of files) {
    const id = path.basename(file, path.extname(file));
    try {
      const url = pathToFileURL(path.join(dir, file)).href;
      const mod = await import(url);
      const plugin: Plugin | undefined = mod.default;
      if (plugin) {
        await registerPlugin(plugin);
      }
    } catch (err) {
      registry.set(id, {
        id,
        name: id,
        enabled: false,
        error: String(err),
      });
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
