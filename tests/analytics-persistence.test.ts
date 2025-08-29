import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

const metricsFile = path.join(process.cwd(), 'data', 'analytics-metrics.json');

beforeEach(async () => {
  await fs.rm(metricsFile, { force: true });
  vi.resetModules();
});

afterEach(async () => {
  await fs.rm(metricsFile, { force: true });
});

describe('analytics persistence', () => {
  it('restores metrics after reload', async () => {
    const analytics1 = await import('../src/lib/analytics');
    analytics1.recordResponseTime('agent', 100);
    analytics1.incrementError('agent');
    analytics1.recordTokens('agent', 20);
    await analytics1.writeMetrics();

    vi.resetModules();
    const analytics2 = await import('../src/lib/analytics');
    const restored = analytics2.getMetrics('agent');
    expect(restored).toEqual({
      responseTimes: [100],
      errorCount: 1,
      tokensUsed: 20,
    });
  });
});
