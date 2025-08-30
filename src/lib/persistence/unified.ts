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

// Browser-based persistence using localStorage
class BrowserPersistence implements SessionPersistence {
  async readSessions(): Promise<AgentSession[]> {
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

  async writeSessions(sessions: AgentSession[]): Promise<void> {
    try {
      localStorage.setItem('agent-sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to write sessions to localStorage:', error);
    }
  }
}

// Memory-based persistence as fallback
class MemoryPersistence implements SessionPersistence {
  private sessions: AgentSession[] = [];

  async readSessions(): Promise<AgentSession[]> {
    return this.sessions.map(parseSession);
  }

  async writeSessions(sessions: AgentSession[]): Promise<void> {
    this.sessions = sessions;
  }
}

// Create the appropriate persistence based on environment
function createPersistence(): SessionPersistence {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return new BrowserPersistence();
  }
  return new MemoryPersistence();
}

export const unifiedSessionPersistence = createPersistence();

// Generic storage functions
export async function read<T>(name: string, defaultValue: T): Promise<T> {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`agent-data-${name}`);
      if (!stored) return defaultValue;
      return JSON.parse(stored) as T;
    } catch (error) {
      console.error(`Failed to read ${name} from localStorage:`, error);
      return defaultValue;
    }
  }
  return defaultValue;
}

export async function write<T>(name: string, data: T): Promise<void> {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`agent-data-${name}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to write ${name} to localStorage:`, error);
    }
  }
}

export const unifiedPersistence = { read, write, readSessions: unifiedSessionPersistence.readSessions.bind(unifiedSessionPersistence), writeSessions: unifiedSessionPersistence.writeSessions.bind(unifiedSessionPersistence) };