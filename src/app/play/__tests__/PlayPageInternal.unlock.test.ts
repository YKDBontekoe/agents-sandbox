import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ensureStateForSkillUnlock } from '../PlayPageInternal';
import logger from '@/lib/logger';
import type { SkillNode } from '@/components/game/skills/types';

describe('ensureStateForSkillUnlock', () => {
  const skill: SkillNode = {
    id: 'test-skill',
    title: 'Test Skill',
    description: 'A skill used for testing.',
    category: 'mystical',
    rarity: 'common',
    quality: 'common',
    tags: [],
    cost: {},
    baseCost: {},
    effects: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('warns and notifies when the state has not hydrated yet', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const notify = vi.fn();

    const result = ensureStateForSkillUnlock(null, skill, notify);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('Received skill unlock "test-skill" before state hydration');
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'Syncing game data',
      }),
    );
  });

  it('allows unlock processing when state is present', () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const notify = vi.fn();

    const hydratedState = {
      id: 'state-1',
      cycle: 1,
      resources: { coin: 0, mana: 0, favor: 0 },
      workers: 0,
      buildings: [],
    };

    const result = ensureStateForSkillUnlock(hydratedState, skill, notify);

    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});
