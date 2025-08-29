import { AgentConfig } from '@/types/agent';
import { generateId } from './utils';

class MarketplaceStore {
  private agents: Map<string, AgentConfig> = new Map();

  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): AgentConfig | null {
    return this.agents.get(id) || null;
  }

  publishAgent(config: AgentConfig): AgentConfig {
    const agent: AgentConfig = {
      ...config,
      id: config.id || generateId(),
      createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
      updatedAt: new Date(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }
}

export const marketplaceStore = new MarketplaceStore();
