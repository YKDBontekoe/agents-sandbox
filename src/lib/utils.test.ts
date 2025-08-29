import { describe, it, expect } from 'vitest';
import { countTokens, validateApiKey, getModelsByProvider } from './utils';
import { recordTokens, getMetrics } from './analytics';
import { registerProvider } from './providers';

describe('utils', () => {
  it('countTokens counts tokens using tiktoken', () => {
    expect(countTokens('Hello world')).toBe(2);
  });

  it('recordTokens counts tokens from text', () => {
    const agentId = `test-agent-${Math.random()}`;
    recordTokens(agentId, 'Hello world from tests');
    const metrics = getMetrics(agentId);
    expect(metrics?.tokensUsed).toBe(countTokens('Hello world from tests'));
  });

  it('validates API keys using provider configs', () => {
    expect(validateApiKey('openai', 'sk-valid')).toBe(true);
    expect(validateApiKey('openai', 'invalid')).toBe(false);
  });

  it('supports registering providers at runtime', () => {
    const id = `test-${Math.random()}`;
    registerProvider(id, { models: ['test-model'], apiKeyPattern: /^test-/ });
    expect(getModelsByProvider(id)).toEqual(['test-model']);
    expect(validateApiKey(id, 'test-123')).toBe(true);
  });
});
