import { AgentConfig } from '@/types/agent';
import { generateId } from './utils';
import { marketplaceStorage } from './marketplace-storage';

class MarketplaceStore {
  async listAgents(filters?: {
    q?: string;
    category?: string;
  }): Promise<AgentConfig[]> {
    const agents = await marketplaceStorage.readAgents();

    // Build a simple category index for faster lookups
    const categoryIndex: Record<string, AgentConfig[]> = {};
    for (const agent of agents) {
      const key = agent.category;
      categoryIndex[key] = categoryIndex[key] || [];
      categoryIndex[key].push(agent);
    }

    let result = agents;
    if (filters?.category) {
      result = categoryIndex[filters.category] || [];
    }
    if (filters?.q) {
      const qLower = filters.q.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(qLower));
    }
    return result;
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
      rating: config.rating ?? 0,
      ratingCount: config.rating ? 1 : 0,
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

  async rateAgent(id: string, rating: number): Promise<AgentConfig | null> {
    const agents = await marketplaceStorage.readAgents();
    const index = agents.findIndex(a => a.id === id);
    if (index === -1) return null;
    const current = agents[index];
    const count = current.ratingCount ?? 0;
    const avg = current.rating ?? 0;
    const newCount = count + 1;
    const newAvg = (avg * count + rating) / newCount;
    const updated: AgentConfig = {
      ...current,
      rating: newAvg,
      ratingCount: newCount,
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
