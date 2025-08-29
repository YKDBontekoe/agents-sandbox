import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentList } from '../AgentList';
import { useAgentDashboardStore } from '@/lib/agent-dashboard-store';
import { AgentConfig } from '@/types/agent';
import { vi } from 'vitest';

vi.mock('../DraggableAgentCard', () => ({
  DraggableAgentCard: ({ agent }: { agent: AgentConfig }) => <div>{agent.name}</div>,
}));

describe('AgentList', () => {
  test('renders empty state', () => {
    useAgentDashboardStore.setState({ agents: [] });
    render(<AgentList />);
    expect(screen.getByText('Create Your First Agent')).toBeInTheDocument();
  });

  test('renders agent cards', () => {
    const agent: AgentConfig = {
      id: '1',
      name: 'Test Agent',
      type: 'chat',
      description: '',
      systemPrompt: '',
      modelConfig: { provider: 'openai', apiKey: '', model: 'gpt-4' },
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    useAgentDashboardStore.setState({ agents: [agent] });
    render(<AgentList />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });
});
