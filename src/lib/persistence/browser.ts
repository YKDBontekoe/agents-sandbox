import { AgentSession } from '@/types/agent';
import { SessionPersistence } from '@/lib/agents/session-persistence';

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
  try {
    const stored = localStorage.getItem('agent-sessions');
    if (!stored) return [];
    const sessions = JSON.parse(stored) as AgentSession[];
    return sessions.map(parseSession);
  } catch (error) {
    console.error('Failed to read sessions from localStorage:', error);
    return [];
  }
}

async function writeSessions(sessions: AgentSession[]): Promise<void> {
  try {
    localStorage.setItem('agent-sessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to write sessions to localStorage:', error);
  }
}

export const browserSessionPersistence: SessionPersistence = {
  readSessions,
  writeSessions,
};

// Generic browser storage functions
async function read<T>(name: string, defaultValue: T): Promise<T> {
  try {
    const stored = localStorage.getItem(`agent-data-${name}`);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.error(`Failed to read ${name} from localStorage:`, error);
    return defaultValue;
  }
}

async function write<T>(name: string, data: T): Promise<void> {
  try {
    localStorage.setItem(`agent-data-${name}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to write ${name} to localStorage:`, error);
  }
}

export const browserPersistence = { read, write, readSessions, writeSessions };