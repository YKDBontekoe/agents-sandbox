import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from './api-client';
import * as apiUtils from './api/utils';

describe('APIClient retry logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiUtils, 'sleep').mockResolvedValue(undefined);
  });

  it('retries on transient failure and succeeds', async () => {
    const metrics = {
      incrementError: vi.fn(),
      recordResponseTime: vi.fn(),
      recordTokens: vi.fn(),
    };
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-success',
      metrics
    );

    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } });

    (client as any).provider.client = {
      chat: { completions: { create: mockCreate } },
    };

    const result = await client.sendMessage([], 'sys');
    expect(result).toBe('ok');
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(metrics.incrementError).toHaveBeenCalledTimes(2);
  });

  it('fails after exceeding max retries', async () => {
    const metrics = {
      incrementError: vi.fn(),
      recordResponseTime: vi.fn(),
      recordTokens: vi.fn(),
    };
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-fail',
      metrics
    );

    const mockCreate = vi.fn().mockRejectedValue(new Error('always fail'));
    (client as any).provider.client = {
      chat: { completions: { create: mockCreate } },
    };

    await expect(client.sendMessage([], 'sys')).rejects.toThrow(/Failed to send message/);
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(metrics.incrementError).toHaveBeenCalledTimes(3);
    expect(metrics.recordResponseTime).not.toHaveBeenCalled();
  });
});
