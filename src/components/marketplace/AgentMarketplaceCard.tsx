'use client';

import { AgentConfig } from '@/types/agent';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface AgentMarketplaceCardProps {
  agent: AgentConfig;
  onImport: () => void;
}

export function AgentMarketplaceCard({ agent, onImport }: AgentMarketplaceCardProps) {
  const t = useTranslations('marketplace');
  return (
    <Card className="agent-card border-0 shadow-lg">
      <CardHeader>
        <CardTitle>{agent.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 mb-4">{agent.description}</p>
        <Button onClick={onImport}>{t('import')}</Button>
      </CardContent>
    </Card>
  );
}
