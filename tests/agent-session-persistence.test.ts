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
    const { sessionStore } = await import('@/lib/agents/session-store');
    await sessionStore.ready;
    const session = sessionStore.createSession('agent-1');
    sessionStore.addMessageToSession(session.id, {
      role: 'user',
      content: 'hello',
      agentId: 'agent-1',
    });
    await sessionStore.waitForPersistence();

    vi.resetModules();
    const { sessionStore: newStore } = await import('@/lib/agents/session-store');
    await newStore.ready;
    const loaded = newStore.getSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.messages.length).toBe(1);
  });
});
