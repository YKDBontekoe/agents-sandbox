import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadPlugins,
  getPlugins,
  enablePlugin,
  disablePlugin,
  updatePluginOptions,
} from './plugin-system';

function createTempPluginDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugins-'));
  const pluginFile = path.join(dir, 'sample.ts');
  fs.writeFileSync(
    pluginFile,
    `export default { id: 'sample', name: 'Sample Plugin' };`,
  );
  return dir;
}

test('plugin enable/disable persists', async () => {
  const dir = createTempPluginDir();
  await loadPlugins(dir);
  let plugin = getPlugins().find((p) => p.id === 'sample');
  assert(plugin);
  assert.strictEqual(plugin!.enabled, false);

  await enablePlugin('sample');
  await loadPlugins(dir);
  plugin = getPlugins().find((p) => p.id === 'sample');
  assert(plugin);
  assert.strictEqual(plugin!.enabled, true);

  await disablePlugin('sample');
  await loadPlugins(dir);
  plugin = getPlugins().find((p) => p.id === 'sample');
  assert(plugin);
  assert.strictEqual(plugin!.enabled, false);
});

test('plugin options persist', async () => {
  const dir = createTempPluginDir();
  await loadPlugins(dir);
  await updatePluginOptions('sample', { greeting: 'hi' });
  await loadPlugins(dir);
  const plugin = getPlugins().find((p) => p.id === 'sample');
  assert(plugin);
  assert.deepStrictEqual(plugin!.options, { greeting: 'hi' });
});

