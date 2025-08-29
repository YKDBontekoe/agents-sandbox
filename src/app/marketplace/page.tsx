'use client';

import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { AgentConfig } from '@/types/agent';
import { createAgent } from '@/lib/agents/repository';
import { AgentMarketplaceCard } from '@/components/marketplace/AgentMarketplaceCard';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function MarketplacePage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    fetch(`/api/marketplace/agents?${params.toString()}`)
      .then(async res => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `Failed to load marketplace agents: ${res.status} ${res.statusText} - ${errorText}`
          );
        }
        return res.json();
      })
      .then((data: AgentConfig[]) => {
        setAgents(data);
        if (!query && !category) {
          setCategories([...new Set(data.map(a => a.category))]);
        }
      })
      .catch(error => {
        console.error(error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to load marketplace agents'
        );
      });
  }, [query, category]);

  const handleImport = async (agent: AgentConfig) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = agent;
    try {
      await createAgent(rest);
      toast.success('Agent imported');
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to import agent'
      );
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">Agent Marketplace</h1>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search agents..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
