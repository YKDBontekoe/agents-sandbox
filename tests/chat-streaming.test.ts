import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let tempDir: string;
let originalCwd: string;
let streamRoute: typeof import('../src/app/api/agents/[id]/stream/route');

const agent = {
  id: 'a1',
  name: 'Test',
  type: 'chat',
  description: 'desc',
  systemPrompt: 'system',
  modelConfig: { provider: 'openai', apiKey: 'key', model: 'gpt-4' },
  temperature: 0.7,
  maxTokens: 1000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-stream-'));
  originalCwd = process.cwd();
  process.chdir(tempDir);
  await fs.mkdir(path.join(tempDir, 'data'));
  await fs.writeFile(path.join(tempDir, 'data', 'agents.json'), JSON.stringify([agent]));
  vi.resetModules();
  vi.mock('../src/lib/api-client', () => {
    return {
      APIClient: class {
        constructor() {}
        async *streamMessage() {
          yield 'hello';
          yield ' world';
        }
      },
    };
  });
  streamRoute = await import('../src/app/api/agents/[id]/stream/route');
});

afterEach(async () => {
  process.chdir(originalCwd);
  await fs.rm(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe('chat streaming endpoint', () => {
  it('emits SSE token sequence', async () => {
    const url = 'http://test/api/agents/a1/stream?messages=' + encodeURIComponent('[]');
    const res = await streamRoute.GET(new Request(url), { params: { id: 'a1' } });
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    const tokens = text
      .trim()
      .split('\n\n')
      .map(chunk => chunk.replace('data: ', ''));
    expect(tokens).toEqual(['hello', ' world', '[DONE]']);
  });
});
