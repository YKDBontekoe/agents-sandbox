import fs from 'fs';
import path from 'path';

export interface PluginState {
  enabled: boolean;
  options?: Record<string, unknown>;
}

export let state: Record<string, PluginState> = {};
let stateFilePath = path.join(process.cwd(), 'plugins', 'plugin-state.json');

export function setStateFilePath(filePath: string): void {
  stateFilePath = filePath;
}

export function loadState(): void {
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

export function saveState(): void {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

