import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentStats } from '../AgentStats';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';
import { AgentConfig, AgentSession } from '@/types/agent';

describe('AgentStats', () => {
  test('displays counts from store', () => {
    const agent: AgentConfig = {
      id: '1',
      name: 'Test',
      type: 'chat',
      description: '',
      systemPrompt: '',
      modelConfig: { provider: 'openai', apiKey: '', model: 'gpt-4' },
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const session: AgentSession = {
      id: 's1',
      agentId: '1',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    useAgentDashboardStore.setState({ agents: [agent], sessions: [session] });
    render(<AgentStats />);
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('Providers')).toBeInTheDocument();
  });
});
