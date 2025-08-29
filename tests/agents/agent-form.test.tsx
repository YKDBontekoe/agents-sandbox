/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AgentForm } from '@/components/agents/AgentForm';

describe('AgentForm', () => {
  afterEach(() => cleanup());
  it('displays errors on invalid submission', async () => {
    const onSave = vi.fn();
    render(<AgentForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Create Agent'));
    await screen.findByText('Agent name is required');
    await screen.findByText('Description is required');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits valid data', async () => {
    const onSave = vi.fn();
    render(<AgentForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText('My AI Assistant'), {
      target: { value: 'Test Agent' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('A helpful AI assistant for general tasks'),
      { target: { value: 'A great agent' } }
    );
    fireEvent.change(screen.getByPlaceholderText('sk-...'), {
      target: { value: 'sk-1234567890' },
    });
    fireEvent.click(screen.getByText('Create Agent'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].name).toBe('Test Agent');
  });
});
