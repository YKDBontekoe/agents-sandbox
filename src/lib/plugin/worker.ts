const workerScript = `import { parentPort, workerData } from 'worker_threads';
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
}`;

export default workerScript;

