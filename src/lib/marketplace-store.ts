import { AgentConfig } from '@/types/agent';
import { generateId } from './utils';
import { marketplaceStorage } from './marketplace-storage';

class MarketplaceStore {
  async listAgents(): Promise<AgentConfig[]> {
    return marketplaceStorage.readAgents();
  }

  async getAgent(id: string): Promise<AgentConfig | null> {
    const agents = await marketplaceStorage.readAgents();
    return agents.find(a => a.id === id) || null;
  }

  async publishAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentConfig> {
    const agents = await marketplaceStorage.readAgents();
    const agent: AgentConfig = {
      ...config,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    agents.push(agent);
    await marketplaceStorage.writeAgents(agents);
    return agent;
  }

  async updateAgent(id: string, updates: Partial<AgentConfig>): Promise<AgentConfig | null> {
    const agents = await marketplaceStorage.readAgents();
    const index = agents.findIndex(a => a.id === id);
    if (index === -1) return null;
    const updated: AgentConfig = {
      ...agents[index],
      ...updates,
      id,
      createdAt: new Date(agents[index].createdAt),
      updatedAt: new Date(),
    };
    agents[index] = updated;
    await marketplaceStorage.writeAgents(agents);
    return updated;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const agents = await marketplaceStorage.readAgents();
    const filtered = agents.filter(a => a.id !== id);
    if (filtered.length === agents.length) return false;
    await marketplaceStorage.writeAgents(filtered);
    return true;
  }
}

export const marketplaceStore = new MarketplaceStore();
