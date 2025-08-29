'use client';

import { useEffect, useState } from 'react';
import { AgentConfig } from '@/types/agent';
import { agentStore } from '@/lib/agent-store';
import { AgentMarketplaceCard } from '@/components/marketplace/AgentMarketplaceCard';

export default function MarketplacePage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);

  useEffect(() => {
    fetch('/api/marketplace/agents')
      .then(res => res.json())
      .then(setAgents)
      .catch(console.error);
  }, []);

  const handleImport = (agent: AgentConfig) => {
    const { id, createdAt, updatedAt, ...rest } = agent;
    agentStore.createAgent(rest);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Agent Marketplace</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <AgentMarketplaceCard
            key={agent.id}
            agent={agent}
            onImport={() => handleImport(agent)}
          />
        ))}
      </div>
    </div>
  );
}
