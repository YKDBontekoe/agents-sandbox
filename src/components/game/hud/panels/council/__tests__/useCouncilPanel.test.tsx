import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCouncilPanel } from '../useCouncilPanel';
import type { CouncilProposal } from '../../../CouncilPanel';
import type { GameResources } from '../../../types';

describe('useCouncilPanel', () => {
  const resources: GameResources = {
    grain: 50,
    coin: 20,
    mana: 15,
    favor: 5,
    wood: 30,
    planks: 10,
    unrest: 1,
    threat: 1,
  };

  const baseProposal: Omit<CouncilProposal, 'id' | 'title' | 'description' | 'cost' | 'benefit'> = {
    type: 'economic',
    risk: 35,
    duration: 2,
    requirements: [],
    canScry: false,
  };

  it('flags proposals that cannot be afforded and exposes disable reasons', () => {
    const proposals: CouncilProposal[] = [
      {
        ...baseProposal,
        id: 'expensive',
        title: 'Grand Project',
        description: 'Requires substantial grain reserves.',
        cost: { grain: 60 },
        benefit: { favor: 5 },
      },
      {
        ...baseProposal,
        id: 'modest',
        title: 'Modest Works',
        description: 'Within current means.',
        cost: { grain: 10 },
        benefit: { favor: 2 },
      },
    ];

    const { result } = renderHook(() => useCouncilPanel({ proposals, currentResources: resources }));

    const expensive = result.current.viewModels.find((vm) => vm.proposal.id === 'expensive');
    const modest = result.current.viewModels.find((vm) => vm.proposal.id === 'modest');

    expect(expensive).toBeDefined();
    expect(expensive?.canAfford).toBe(false);
    expect(expensive?.disableReasons.accept).toBe('Insufficient resources');

    expect(modest).toBeDefined();
    expect(modest?.canAfford).toBe(true);
    expect(modest?.disableReasons.accept).toBeUndefined();

    expect(result.current.pendingStates.expensive).toBe(true);
    expect(result.current.pendingStates.modest).toBe(true);
  });
});
