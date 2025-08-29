import type { PluginState } from './state';
import { state, saveState } from './state';

export interface Plugin {
  id: string;
  name: string;
  onLoad?: (options?: Record<string, unknown>) => void | Promise<void>;
  onEnable?: (options?: Record<string, unknown>) => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  enabled?: boolean;
  options?: Record<string, unknown>;
  permissions?: string[];
  logs?: string[];
  errors?: string[];
  warning?: string;
  error?: string;
}

export const registry = new Map<string, Plugin>();

export async function registerPlugin(plugin: Plugin): Promise<void> {
  if (registry.has(plugin.id)) {
    throw new Error(`Plugin with id "${plugin.id}" already registered`);
  }

  const persisted: PluginState | undefined = state[plugin.id];
  const entry: Plugin = {
    ...plugin,
    enabled: persisted?.enabled ?? plugin.enabled ?? false,
    options: { ...plugin.options, ...persisted?.options },
    permissions: plugin.permissions ?? [],
    logs: plugin.logs ?? [],
    errors: plugin.errors ?? [],
  };

  registry.set(plugin.id, entry);
  try {
    await plugin.onLoad?.(entry.options);
  } catch (err) {
    entry.error = String(err);
  }
  if (entry.enabled) {
    try {
      await plugin.onEnable?.(entry.options);
    } catch (err) {
      entry.error = String(err);
    }
  }
  if (entry.permissions.length) {
    entry.warning = `Requests permissions: ${entry.permissions.join(', ')}`;
  }
}

export function getPlugins(): Plugin[] {
  return Array.from(registry.values());
}

export async function enablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && !plugin.enabled) {
    plugin.enabled = true;
    try {
      await plugin.onEnable?.(plugin.options);
    } catch (err) {
      plugin.error = String(err);
    }
    state[id] = { ...state[id], enabled: true, options: plugin.options };
    saveState();
  }
}

export async function disablePlugin(id: string): Promise<void> {
  const plugin = registry.get(id);
  if (plugin && plugin.enabled) {
    plugin.enabled = false;
    try {
      await plugin.onDisable?.();
    } catch (err) {
      plugin.error = String(err);
    }
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

