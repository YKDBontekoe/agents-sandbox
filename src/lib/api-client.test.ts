import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from './api-client';
import { getMetrics } from './analytics';

describe('APIClient retry logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries on transient failure and succeeds', async () => {
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-success'
    );
    // Mock sleep to avoid delays
    vi.spyOn(client as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } });

    (client as unknown as { client: Record<string, unknown> }).client = {
      chat: { completions: { create: mockCreate } }
    };

    const result = await client.sendMessage([], 'sys');
    expect(result).toBe('ok');
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(getMetrics('agent-success')?.errorCount).toBe(2);
  });

  it('fails after exceeding max retries', async () => {
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-fail'
    );
    vi.spyOn(client as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    const mockCreate = vi.fn().mockRejectedValue(new Error('always fail'));
    (client as unknown as { client: Record<string, unknown> }).client = {
      chat: { completions: { create: mockCreate } }
    };

    await expect(client.sendMessage([], 'sys')).rejects.toThrow(/Failed to send message/);
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(getMetrics('agent-fail')?.errorCount).toBe(3);
  });
});

