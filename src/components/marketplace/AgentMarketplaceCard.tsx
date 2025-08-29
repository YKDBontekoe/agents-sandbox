'use client';

import { useState } from 'react';
import { AgentConfig } from '@/types/agent';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

interface AgentMarketplaceCardProps {
  agent: AgentConfig;
  onImport: () => void;
}

export function AgentMarketplaceCard({ agent, onImport }: AgentMarketplaceCardProps) {
  const [rating, setRating] = useState(agent.rating ?? 0);

  const handleRate = async (value: number) => {
    try {
      const res = await fetch(`/api/marketplace/agents/${agent.id}/rating`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) {
        const updated = (await res.json()) as AgentConfig;
        setRating(updated.rating ?? value);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="agent-card border-0 shadow-lg">
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 cursor-pointer ${
                i < Math.round(rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
              onClick={() => handleRate(i + 1)}
            />
          ))}
          <span className="ml-2 text-sm text-slate-600">
            {rating.toFixed(1)}
          </span>
        </div>
        <p className="text-slate-600 mb-4">{agent.description}</p>
        <Button onClick={onImport}>Import</Button>
      </CardContent>
    </Card>
  );
}
