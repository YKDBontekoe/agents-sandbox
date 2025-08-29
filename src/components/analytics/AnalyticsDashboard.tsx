'use client';

import React, { useEffect, useState } from 'react';
import { getAllMetrics, AgentMetrics } from '@/lib/analytics';
import { agentStore } from '@/lib/agent-store';
import { AgentConfig } from '@/types/agent';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<Record<string, AgentMetrics>>({});
  const [agents, setAgents] = useState<AgentConfig[]>([]);

  useEffect(() => {
    const update = () => setMetrics({ ...getAllMetrics() });
    update();
    if (typeof window !== 'undefined') {
      window.addEventListener('analytics-updated', update);
      return () => window.removeEventListener('analytics-updated', update);
    }
  }, []);

  useEffect(() => {
    agentStore.fetchAgents().then(setAgents).catch(console.error);
  }, []);

  const maxTokens = Math.max(1, ...Object.values(metrics).map(m => m.tokensUsed));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Agent</th>
              <th className="pb-2">Avg Response (ms)</th>
              <th className="pb-2">Errors</th>
              <th className="pb-2">Tokens Used</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics).map(([id, data]) => {
              const agent = agents.find(a => a.id === id);
              const avgResponse = average(data.responseTimes).toFixed(0);
              const tokenPercent = (data.tokensUsed / maxTokens) * 100;
              return (
                <tr key={id} className="border-t">
                  <td className="py-2">{agent ? agent.name : id}</td>
                  <td className="py-2">{avgResponse}</td>
                  <td className="py-2">{data.errorCount}</td>
                  <td className="py-2">
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${tokenPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.tokensUsed}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
