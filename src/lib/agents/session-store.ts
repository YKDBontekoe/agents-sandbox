import { AgentSession, ChatMessage } from '@/types/agent';
import { generateId } from '../utils';
import { recordTokens } from '../analytics';
import { unifiedSessionPersistence } from '../persistence/unified';
import { SessionPersistence } from './session-persistence';

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

class SessionStore {
  private sessions: Map<string, AgentSession> = new Map();
  private savePromise: Promise<void> = Promise.resolve();
  private persistence: SessionPersistence;
  public ready: Promise<void>;

  constructor(persistence: SessionPersistence) {
    this.persistence = persistence;
    this.ready = this.persistence.readSessions().then(sessions => {
      sessions.map(parseSession).forEach(s => this.sessions.set(s.id, s));
    });
  }

  createSession(agentId: string): AgentSession {
    const session: AgentSession = {
      id: generateId(),
      agentId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    void this.persist();
    this.notifyChange();
    return session;
  }

  getSession(id: string): AgentSession | null {
    return this.sessions.get(id) || null;
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByAgent(agentId: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.agentId === agentId);
  }

  addMessageToSession(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): ChatMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    session.messages.push(newMessage);
    session.updatedAt = new Date();

    if (newMessage.agentId) {
      recordTokens(newMessage.agentId, newMessage.content);
    }

    this.sessions.set(sessionId, session);
    void this.persist();
    this.notifyChange();
    return newMessage;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      void this.persist();
      this.notifyChange();
    }
    return deleted;
  }

  clearAll(): void {
    this.sessions.clear();
    void this.persist();
    this.notifyChange();
  }

  private persist(): Promise<void> {
    const data = Array.from(this.sessions.values());
    this.savePromise = this.persistence.writeSessions(data);
    return this.savePromise;
  }

  async waitForPersistence(): Promise<void> {
    await this.savePromise;
  }

  private notifyChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agent-sessions-changed'));
    }
  }
}

export const sessionStore = new SessionStore(unifiedSessionPersistence);

