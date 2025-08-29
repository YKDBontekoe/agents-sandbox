import { AgentSession } from '@/types/agent';

export interface SessionPersistence {
  readSessions(): Promise<AgentSession[]>;
  writeSessions(sessions: AgentSession[]): Promise<void>;
}

