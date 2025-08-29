import { AgentConfig, AgentSession, ChatMessage } from '@/types/agent';
import { generateId } from './utils';

class AgentStore {
  private agents: Map<string, AgentConfig> = new Map();
  private sessions: Map<string, AgentSession> = new Map();
  private storageKey = 'agentic-app-data';

  private notifySessionsChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('agent-sessions-changed'));
    }
  }

  constructor() {
    this.loadFromStorage();
  }

  // Agent management
  createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): AgentConfig {
    const agent: AgentConfig = {
      version: '1.0.0',
      visibility: 'private',
      screenshots: [],
      rating: 0,
      ...config,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.agents.set(agent.id, agent);
    this.saveToStorage();
    return agent;
  }

  updateAgent(id: string, updates: Partial<AgentConfig>): AgentConfig | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    const updatedAgent = {
      ...agent,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();
    return updatedAgent;
  }

  deleteAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    // Also delete all sessions for this agent
    Array.from(this.sessions.values())
      .filter(session => session.agentId === id)
      .forEach(session => this.sessions.delete(session.id));
    
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  getAgent(id: string): AgentConfig | null {
    return this.agents.get(id) || null;
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  // Session management
  createSession(agentId: string): AgentSession {
    const session: AgentSession = {
      id: generateId(),
      agentId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(session.id, session);
    this.saveToStorage();
    this.notifySessionsChanged();
    return session;
  }

  getSession(id: string): AgentSession | null {
    return this.sessions.get(id) || null;
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByAgent(agentId: string): AgentSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.agentId === agentId);
  }

  addMessageToSession(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date();
    
    this.sessions.set(sessionId, session);
    this.saveToStorage();
    return newMessage;
  }

  deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      this.saveToStorage();
      this.notifySessionsChanged();
    }
    return deleted;
  }

  // Storage management
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    const data = {
      agents: Array.from(this.agents.entries()),
      sessions: Array.from(this.sessions.entries()),
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.agents) {
        this.agents = new Map(
          data.agents.map(([id, agent]: [string, AgentConfig]) => [
            id,
            {
              ...agent,
              createdAt: new Date(agent.createdAt),
              updatedAt: new Date(agent.updatedAt),
            },
          ]),
        );
      }

      if (data.sessions) {
        this.sessions = new Map(
          data.sessions.map(([id, session]: [string, AgentSession]) => [
            id,
            {
              ...session,
              createdAt: new Date(session.createdAt),
              updatedAt: new Date(session.updatedAt),
              messages: session.messages.map((msg: ChatMessage) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            },
          ]),
        );
      }
    } catch (error) {
      console.error('Failed to load data from storage:', error);
    }
  }

  clearAll(): void {
    this.agents.clear();
    this.sessions.clear();
    this.saveToStorage();
    this.notifySessionsChanged();
  }
}

export const agentStore = new AgentStore();
