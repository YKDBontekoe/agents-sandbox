import test from 'node:test';
import assert from 'node:assert/strict';
import { countTokens } from './utils';
import { recordTokens, getMetrics } from './analytics';

test('countTokens counts tokens using tiktoken', () => {
  assert.equal(countTokens('Hello world'), 2);
});

test('recordTokens counts tokens from text', () => {
  const agentId = 'test-agent';
  recordTokens(agentId, 'Hello world from tests');
  const metrics = getMetrics(agentId);
  assert.equal(metrics?.tokensUsed, countTokens('Hello world from tests'));
});
