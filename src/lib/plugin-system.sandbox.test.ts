import { it, expect } from 'vitest';
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

it('plugin cannot access process.env', async () => {
  const dir = createSandboxPluginDir();
  await loadPlugins(dir);
  const plugin = getPlugins().find((p) => p.id.startsWith('sandbox'));
  expect(plugin).toBeDefined();
  expect(plugin!.error).toBeDefined();
  expect(plugin!.error).toMatch(/env/);
});
