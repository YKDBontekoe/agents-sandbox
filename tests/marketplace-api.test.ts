import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createDefaultAgentConfig } from '@/lib/agents/agent-builder';

const baseAgent = createDefaultAgentConfig();
const validAgent = {
  ...baseAgent,
  name: 'Test Agent',
  description: 'desc',
  category: 'utilities',
  systemPrompt: 'prompt',
  modelConfig: {
    ...baseAgent.modelConfig,
    apiKey: 'key',
    model: 'gpt-4',
  },
  temperature: 0.5,
};

let tempFile: string;
let agentsRoute: typeof import('../src/app/api/marketplace/agents/route');
let agentRoute: typeof import('../src/app/api/marketplace/agents/[id]/route');

beforeEach(async () => {
  tempFile = path.join(os.tmpdir(), `marketplace-${Math.random()}.json`);
  process.env.MARKETPLACE_DATA_FILE = tempFile;
  await fs.writeFile(tempFile, '[]');
  vi.resetModules();
  agentsRoute = await import('../src/app/api/marketplace/agents/route');
  agentRoute = await import('../src/app/api/marketplace/agents/[id]/route');
});

afterEach(async () => {
  await fs.unlink(tempFile).catch(() => {});
  delete process.env.MARKETPLACE_DATA_FILE;
});

describe('marketplace API', () => {
  it('creates and lists agents', async () => {
    const res = await agentsRoute.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(validAgent) }));
    expect(res.status).toBe(201);
    const created = await res.json();
    const listRes = await agentsRoute.GET(new Request('http://test'));
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it('rejects invalid payload', async () => {
    const res = await agentsRoute.POST(new Request('http://test', { method: 'POST', body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });

  it('updates and deletes an agent', async () => {
    const createRes = await agentsRoute.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(validAgent) }));
    const created = await createRes.json();
    const id = created.id as string;

    const updateRes = await agentRoute.PUT(
      new Request('http://test', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) }),
      { params: Promise.resolve({ id }) }
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.name).toBe('Updated');

    const deleteRes = await agentRoute.DELETE(
      new Request('http://test', { method: 'DELETE' }),
      { params: Promise.resolve({ id }) }
    );
    expect(deleteRes.status).toBe(200);

    const getRes = await agentRoute.GET(
      new Request('http://test'),
      { params: Promise.resolve({ id }) }
    );
    expect(getRes.status).toBe(404);
  });

  it('rejects invalid update payload', async () => {
    const createRes = await agentsRoute.POST(new Request('http://test', { method: 'POST', body: JSON.stringify(validAgent) }));
    const created = await createRes.json();
    const id = created.id as string;
    const res = await agentRoute.PUT(
      new Request('http://test', { method: 'PUT', body: JSON.stringify({ type: 'invalid' }) }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(400);
  });
});
