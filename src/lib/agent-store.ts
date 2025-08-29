import { AgentConfig, AgentSession, ChatMessage } from '@/types/agent';
import { generateId } from './utils';
import { recordTokens } from './analytics';
import { persistence } from './persistence/file';
import { fetchJson } from './http';

class AgentStore {
  private agents: AgentConfig[] = [];
  private sessions: Map<string, AgentSession> = new Map();
  public ready: Promise<void>;
  private savePromise: Promise<void> = Promise.resolve();

  constructor() {
    this.ready = persistence.readSessions().then(sessions => {
      sessions.forEach(s => this.sessions.set(s.id, s));
    });
  }

  // Agent management
  async fetchAgents(): Promise<AgentConfig[]> {
    const data = await fetchJson<AgentConfig[]>('/agents');
    this.agents = data.map(a => this.parseAgent(a));
    return this.agents;
  }

  getAllAgents(): AgentConfig[] {
    return this.agents;
  }

  async createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
    const agent = this.parseAgent(
      await fetchJson<AgentConfig>('/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
    );
    this.agents.push(agent);
    return agent;
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    try {
      const agent = this.parseAgent(
        await fetchJson<AgentConfig>(`/agents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
      );
      this.agents = this.agents.map(a => (a.id === id ? agent : a));
      return agent;
    } catch {
      return null;
    }
  }

  async deleteAgent(id: string): Promise<boolean> {
    try {
      await fetchJson(`/agents/${id}`, { method: 'DELETE' });
      this.agents = this.agents.filter(a => a.id !== id);
      // Remove sessions for this agent
      Array.from(this.sessions.values())
        .filter(s => s.agentId === id)
        .forEach(s => this.sessions.delete(s.id));
      return true;
    } catch {
      return false;
    }
  }

  // Session management (in-memory)
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
    return newMessage;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) void this.persist();
    return deleted;
  }

  clearAll(): void {
    this.agents = [];
    this.sessions.clear();
    void this.persist();
  }

  private parseAgent(raw: AgentConfig): AgentConfig {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private persist(): Promise<void> {
    const data = Array.from(this.sessions.values());
    this.savePromise = persistence.writeSessions(data);
    return this.savePromise;
  }

  async waitForPersistence(): Promise<void> {
    await this.savePromise;
  }
}

export const agentStore = new AgentStore();
