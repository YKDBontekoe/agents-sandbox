import { promises as fs } from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const sessionsFile = path.join(process.cwd(), 'data', 'sessions.json');

async function cleanSessions() {
  try {
    await fs.unlink(sessionsFile);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

describe('agent session persistence', () => {
  beforeEach(async () => {
    await cleanSessions();
    vi.resetModules();
  });

  it('persists sessions across restarts', async () => {
    const { agentStore } = await import('@/lib/agent-store');
    await agentStore.ready;
    const session = agentStore.createSession('agent-1');
    agentStore.addMessageToSession(session.id, {
      role: 'user',
      content: 'hello',
      agentId: 'agent-1',
    });
    await agentStore.waitForPersistence();

    vi.resetModules();
    const { agentStore: newStore } = await import('@/lib/agent-store');
    await newStore.ready;
    const loaded = newStore.getSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.messages.length).toBe(1);
  });
});
