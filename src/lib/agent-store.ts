import { AgentConfig, AgentSession, ChatMessage } from '@/types/agent';
import { generateId } from './utils';
import { recordTokens } from './analytics';

class AgentStore {
  private agents: AgentConfig[] = [];
  private sessions: Map<string, AgentSession> = new Map();
  private baseUrl = '/api/agents';

  // Agent management
  async fetchAgents(): Promise<AgentConfig[]> {
    const res = await fetch(this.baseUrl);
    const data = (await res.json()) as AgentConfig[];
    this.agents = data.map(a => this.parseAgent(a));
    return this.agents;
  }

  getAllAgents(): AgentConfig[] {
    return this.agents;
  }

  async createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const agent = this.parseAgent((await res.json()) as AgentConfig);
    this.agents.push(agent);
    return agent;
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    const agent = this.parseAgent((await res.json()) as AgentConfig);
    this.agents = this.agents.map(a => (a.id === id ? agent : a));
    return agent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    if (!res.ok) return false;
    this.agents = this.agents.filter(a => a.id !== id);
    // Remove sessions for this agent
    Array.from(this.sessions.values())
      .filter(s => s.agentId === id)
      .forEach(s => this.sessions.delete(s.id));
    return true;
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
      const tokens = newMessage.content.split(/\s+/).filter(Boolean).length;
      recordTokens(newMessage.agentId, tokens);
    }

    this.sessions.set(sessionId, session);
    return newMessage;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  clearAll(): void {
    this.agents = [];
    this.sessions.clear();
  }

  private parseAgent(raw: AgentConfig): AgentConfig {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }
}

export const agentStore = new AgentStore();
