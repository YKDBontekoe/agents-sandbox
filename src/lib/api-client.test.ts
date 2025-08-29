import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIClient } from './api-client';
import * as apiUtils from './api/utils';
import * as analytics from './analytics';

describe('APIClient retry logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiUtils, 'sleep').mockResolvedValue(undefined);
    vi.spyOn(analytics, 'incrementError').mockImplementation(() => {});
    vi.spyOn(analytics, 'recordResponseTime').mockImplementation(() => {});
    vi.spyOn(analytics, 'recordTokens').mockImplementation(() => {});
  });

  it('retries on transient failure and succeeds', async () => {
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-success'
    );

    const mockCreate = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue({ choices: [{ message: { content: 'ok' } }], usage: { total_tokens: 1 } });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).client = {
      chat: { completions: { create: mockCreate } },
    };

    const result = await client.sendMessage([], 'sys');
    expect(result).toBe('ok');
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(analytics.incrementError).toHaveBeenCalledTimes(2);
  });

  it('fails after exceeding max retries', async () => {
    const client = new APIClient(
      { provider: 'openai', apiKey: 'x', model: 'gpt', maxRetries: 2, timeoutMs: 1000 },
      'agent-fail'
    );

    const mockCreate = vi.fn().mockRejectedValue(new Error('always fail'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).client = {
      chat: { completions: { create: mockCreate } },
    };

    await expect(client.sendMessage([], 'sys')).rejects.toThrow(/Failed to send message/);
    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(analytics.incrementError).toHaveBeenCalledTimes(3);
    expect(analytics.recordResponseTime).not.toHaveBeenCalled();
  });
});
