import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

import workerScript from './plugin/worker';
import {
  registry,
  registerPlugin,
  getPlugins,
  enablePlugin,
  disablePlugin,
  updatePluginOptions,
} from './plugin/registry';
import type { Plugin } from './plugin/registry';
import { loadState, setStateFilePath } from './plugin/state';

const workers = new Map<string, Worker>();
const PLUGIN_TIMEOUT = 1000;

function callWorker(worker: Worker, method: string, options?: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const listener = (msg: { type: string; method: string; error?: string }) => {
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

async function createWorker(filePath: string): Promise<{ worker: Worker; meta: { id: string; name: string; permissions?: string[] }; error?: string }> {
  const worker = new Worker(workerScript, { eval: true, type: 'module', workerData: { file: filePath } });

  return new Promise((resolve, reject) => {
    const onMessage = (
      msg: { type: 'loaded'; plugin?: { id: string; name: string; permissions?: string[] }; error?: string },
    ) => {
      if (msg.type === 'loaded') {
        worker.off('message', onMessage);
        resolve({ worker, meta: msg.plugin ?? { id: path.basename(filePath), name: path.basename(filePath) }, error: msg.error });
      }
    };
    worker.on('message', onMessage);
    worker.on('error', reject);
  });
}

export async function loadPlugins(dir = path.join(process.cwd(), 'plugins')): Promise<void> {
  registry.clear();
  workers.forEach((w) => w.terminate());
  workers.clear();
  setStateFilePath(path.join(dir, 'plugin-state.json'));
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
    worker.on('message', (msg: { type: 'log' | 'consoleError'; data: unknown }) => {
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

export { registerPlugin, getPlugins, enablePlugin, disablePlugin, updatePluginOptions };
export type { Plugin };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  loadPlugins().then(() => {
    const loaded = getPlugins()
      .map((p) => `${p.id}${p.enabled ? ' (enabled)' : ''}`)
      .join(', ');
    console.log(`Loaded plugins: ${loaded || 'none'}`);
  });
}

