import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useEdictsPanel } from './useEdictsPanel';
import type { EdictSetting } from './types';

const createEdicts = (): EdictSetting[] => [
  {
    id: 'grain_tithe',
    name: 'Grain Tithe',
    description: 'Adjust tithe to bolster the granaries.',
    type: 'slider',
    category: 'economic',
    currentValue: 40,
    defaultValue: 40,
    cost: 3,
    effects: [],
  },
  {
    id: 'night_watch',
    name: 'Night Watch',
    description: 'Post wardens along the streets after dusk.',
    type: 'toggle',
    category: 'military',
    currentValue: 0,
    defaultValue: 0,
    cost: 2,
    effects: [],
  },
  {
    id: 'festival',
    name: 'Festival Dockets',
    description: 'Authorize seasonal celebrations to calm unrest.',
    type: 'toggle',
    category: 'social',
    currentValue: 1,
    defaultValue: 1,
    cost: 5,
    effects: [],
  },
  {
    id: 'road_upkeep',
    name: 'Road Upkeep',
    description: 'Divert crews to smooth the cobbles.',
    type: 'slider',
    category: 'infrastructure',
    currentValue: 50,
    defaultValue: 50,
    effects: [],
  },
];

describe('useEdictsPanel', () => {
  it('reports zero total cost when no edicts have pending changes', () => {
    const edicts = createEdicts();
    const { result } = renderHook(() =>
      useEdictsPanel({ edicts, pendingChanges: {}, currentFavor: 10 }),
    );

    expect(result.current.totalCost).toBe(0);
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.changesToApply).toEqual({});
    expect(result.current.canAfford).toBe(true);
  });

  it('sums favor cost for each modified edict and checks affordability', () => {
    const edicts = createEdicts();
    const { result } = renderHook(() =>
      useEdictsPanel({
        edicts,
        pendingChanges: {
          grain_tithe: 60,
          night_watch: 0,
          festival: 0,
        },
        currentFavor: 7,
      }),
    );

    expect(result.current.totalCost).toBe(8);
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.canAfford).toBe(false);
    expect(result.current.changesToApply).toEqual({
      grain_tithe: 60,
      festival: 0,
    });
  });

  it('ignores unchanged entries and treats missing costs as zero', () => {
    const edicts = createEdicts();
    const { result } = renderHook(() =>
      useEdictsPanel({
        edicts,
        pendingChanges: {
          grain_tithe: 40,
          road_upkeep: 75,
        },
        currentFavor: 2,
      }),
    );

    expect(result.current.totalCost).toBe(0);
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.canAfford).toBe(true);
    expect(result.current.changesToApply).toEqual({
      road_upkeep: 75,
    });
  });
});
