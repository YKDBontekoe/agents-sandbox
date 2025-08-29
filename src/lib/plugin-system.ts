import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

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

interface PluginState {
  enabled: boolean;
  options?: Record<string, unknown>;
}

const registry = new Map<string, Plugin>();
const workers = new Map<string, Worker>();
const PLUGIN_TIMEOUT = 1000;
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

function callWorker(worker: Worker, method: string, options?: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = (msg: any) => {
      if (msg.type === 'result' && msg.method === method) {
        worker.off('message', listener);
        resolve();
      } else if (msg.type === 'error' && msg.method === method) {
        worker.off('message', listener);
        reject(new Error(msg.error));
      }
    };
    worker.on('message', listener);
    worker.postMessage({ method, options, timeout: PLUGIN_TIMEOUT });
  });
}

async function createWorker(filePath: string): Promise<{ worker: Worker; meta: { id: string; name: string; permissions?: string[] }; error?: string }>
{
  const worker = new Worker(
    `import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import { NodeVM } from 'vm2';
import { transpileModule } from 'typescript';
const file = workerData.file;
let code = fs.readFileSync(file, 'utf8');
if (file.endsWith('.ts')) {
  code = transpileModule(code, { compilerOptions: { module: 1 } }).outputText;
}
const vm = new NodeVM({
  console: 'redirect',
  sandbox: {},
  require: { external: false, builtin: [] },
});
vm.freeze(undefined, 'process');
vm.on('console.log', (...args) => parentPort.postMessage({ type: 'log', data: args.join(' ') }));
vm.on('console.error', (...args) => parentPort.postMessage({ type: 'consoleError', data: args.join(' ') }));
let plugin;
try {
  plugin = vm.run(code, file).default;
} catch (err) {
  parentPort.postMessage({ type: 'loaded', error: String(err) });
}
if (plugin) {
  parentPort.postMessage({ type: 'loaded', plugin: { id: plugin.id, name: plugin.name, permissions: plugin.permissions } });
  parentPort.on('message', async (msg) => {
    const { method, options, timeout } = msg;
    try {
      await Promise.race([
        plugin[method]?.(options),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
      ]);
      parentPort.postMessage({ type: 'result', method });
    } catch (err) {
      parentPort.postMessage({ type: 'error', method, error: String(err) });
    }
  });
}
`,
    { eval: true, type: 'module', workerData: { file: filePath } },
  );

  return new Promise((resolve, reject) => {
    const onMessage = (msg: any) => {
      if (msg.type === 'loaded') {
        worker.off('message', onMessage);
        resolve({ worker, meta: msg.plugin ?? { id: path.basename(filePath), name: path.basename(filePath) }, error: msg.error });
      }
    };
    worker.on('message', onMessage);
    worker.on('error', reject);
  });
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

export async function loadPlugins(dir = path.join(process.cwd(), 'plugins')): Promise<void> {
  registry.clear();
  workers.forEach((w) => w.terminate());
  workers.clear();
  stateFilePath = path.join(dir, 'plugin-state.json');
  loadState();
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.mjs'));

  for (const file of files) {
    const id = path.basename(file, path.extname(file));
    try {
      const filePath = path.join(dir, file);
      const { worker, meta, error } = await createWorker(filePath);
      const entry: Plugin = {
        id: meta.id || id,
        name: meta.name || id,
        permissions: meta.permissions || [],
        logs: [],
        errors: [],
      };

      if (error) {
        registry.set(entry.id, { ...entry, enabled: false, error });
        worker.terminate();
        continue;
      }

      workers.set(entry.id, worker);
      worker.on('message', (msg: any) => {
        if (msg.type === 'log') entry.logs!.push(String(msg.data));
        if (msg.type === 'consoleError') entry.errors!.push(String(msg.data));
      });

      entry.onLoad = (opts) => callWorker(worker, 'onLoad', opts);
      entry.onEnable = (opts) => callWorker(worker, 'onEnable', opts);
      entry.onDisable = () => callWorker(worker, 'onDisable');

      await registerPlugin(entry);
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
