/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentDashboard } from '@/components/agents/AgentDashboard';
import type { AgentConfig } from '@/types/agent';

// Mock UI components that aren't relevant to the tests
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('react-hot-toast', () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/agents/DragDropProvider', () => ({ DragDropProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/agents/DraggableAgentCard', () => ({ DraggableAgentCard: ({ agent }: { agent: AgentConfig }) => <div>{agent.name}</div> }));
vi.mock('@/components/ui/confirm-dialog', () => ({ ConfirmDialog: () => null }));

// Test data used across tests
const agentInput = {
  name: 'Test Agent',
  description: 'desc',
  category: 'general',
  type: 'chat' as const,
  systemPrompt: 'sys',
  modelConfig: { provider: 'openai', apiKey: 'key', model: 'gpt-4' },
  temperature: 0.7,
  maxTokens: 1000,
};

vi.mock('@/components/agents/AgentForm', () => ({
  AgentForm: ({ onSave, onCancel }: { onSave: (a: typeof agentInput) => Promise<unknown>; onCancel: () => void }) => (
    <div>
      <div>Mock Agent Form</div>
      <button onClick={() => onSave(agentInput).catch(() => {})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/lib/agents/repository', () => ({
  fetchAgents: vi.fn(),
  createAgent: vi.fn(),
}));

import { fetchAgents, createAgent } from '@/lib/agents/repository';

describe('agent creation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds agent after successful creation', async () => {
    fetchAgents.mockResolvedValue([]);
    const newAgent: AgentConfig = {
      ...agentInput,
      id: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    createAgent.mockResolvedValue(newAgent);

    render(<AgentDashboard />);

    await waitFor(() => expect(fetchAgents).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: /create agent/i })[0]);
    fireEvent.click(screen.getByText('Save'));

    await screen.findByText('Test Agent');
  });

  it('keeps form open when repository errors occur', async () => {
    fetchAgents.mockResolvedValue([]);
    createAgent.mockRejectedValue(new Error('fail'));

    render(<AgentDashboard />);

    await waitFor(() => expect(fetchAgents).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: /create agent/i })[0]);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(createAgent).toHaveBeenCalled());

    expect(screen.queryByText('Test Agent')).toBeNull();
    expect(screen.queryByText('Mock Agent Form')).not.toBeNull();
  });
});

