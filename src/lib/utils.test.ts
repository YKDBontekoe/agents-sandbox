import { describe, it, expect } from 'vitest';
import { countTokens } from './utils';
import { recordTokens, getMetrics } from './analytics';

describe('utils', () => {
  it('countTokens counts tokens using tiktoken', () => {
    expect(countTokens('Hello world')).toBe(2);
  });

  it('recordTokens counts tokens from text', () => {
    const agentId = 'test-agent';
    recordTokens(agentId, 'Hello world from tests');
    const metrics = getMetrics(agentId);
    expect(metrics?.tokensUsed).toBe(countTokens('Hello world from tests'));
  });
});
