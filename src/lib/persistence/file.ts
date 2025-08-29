import { promises as fs } from 'fs';
import path from 'path';
import { AgentSession } from '@/types/agent';

const dataDir = path.join(process.cwd(), 'data');

async function read<T>(name: string, defaultValue: T): Promise<T> {
  const filePath = path.join(dataDir, `${name}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    throw err;
  }
}

async function write<T>(name: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, `${name}.json`);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function parseSession(raw: AgentSession): AgentSession {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    messages: raw.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
  };
}

async function readSessions(): Promise<AgentSession[]> {
  const sessions = await read<AgentSession[]>('sessions', []);
  return sessions.map(parseSession);
}

async function writeSessions(sessions: AgentSession[]): Promise<void> {
  await write('sessions', sessions);
}

export const persistence = { read, write, readSessions, writeSessions };
