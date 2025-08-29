import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadPlugins, getPlugins } from './plugin-system';

function createSandboxPluginDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'));
  const pluginFile = path.join(dir, 'sandbox.js');
  fs.writeFileSync(
    pluginFile,
    "const secret = process.env.SECRET;\nmodule.exports = { default: { id: 'sandbox', name: 'Sandbox' } };",
  );
  return dir;
}

test('plugin cannot access process.env', async () => {
  const dir = createSandboxPluginDir();
  await loadPlugins(dir);
  const plugin = getPlugins().find((p) => p.id.startsWith('sandbox'));
  assert(plugin);
  assert(plugin!.error);
  assert.match(plugin!.error!, /env/);
});
