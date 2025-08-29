'use client';

import { AgentConfig } from '@/types/agent';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AgentMarketplaceCardProps {
  agent: AgentConfig;
  onImport: () => void;
}

export function AgentMarketplaceCard({ agent, onImport }: AgentMarketplaceCardProps) {
  return (
    <Card className="agent-card border-0 shadow-lg">
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 mb-4">{agent.description}</p>
        <Button onClick={onImport}>Import</Button>
      </CardContent>
    </Card>
  );
}
