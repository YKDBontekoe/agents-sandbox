import fs from 'fs';
import path from 'path';

const name = process.argv[2];

if (!name) {
  console.error('Please provide a plugin name');
  process.exit(1);
}

const pluginsDir = path.join(process.cwd(), 'plugins');
if (!fs.existsSync(pluginsDir)) {
  fs.mkdirSync(pluginsDir);
}

const filePath = path.join(pluginsDir, `${name}.ts`);
if (fs.existsSync(filePath)) {
  console.error(`Plugin ${name} already exists`);
  process.exit(1);
}

const content = `import type { Plugin } from '@/lib/plugin-system';

const plugin: Plugin = {
  id: '${name}',
  name: '${name.replace(/[-_]/g, ' ')}',
  // permissions: ['fs'],
  onEnable: () => {
    console.log('${name} enabled');
  },
  onDisable: () => {
    console.log('${name} disabled');
  },
};

export default plugin;\n`;

fs.writeFileSync(filePath, content);
console.log(`Created plugin at ${filePath}`);
