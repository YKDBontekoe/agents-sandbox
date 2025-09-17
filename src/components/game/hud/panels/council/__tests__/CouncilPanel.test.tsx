import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouncilPanel, type CouncilProposal } from '../../../CouncilPanel';
import type { GameResources } from '../../../types';

describe('CouncilPanel', () => {
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

  const buildProposal = (overrides: Partial<CouncilProposal>): CouncilProposal => ({
    id: 'default',
    title: 'Default',
    description: 'Default description',
    type: 'economic',
    cost: {},
    benefit: {},
    risk: 20,
    duration: 1,
    requirements: [],
    canScry: false,
    ...overrides,
  });

  it('invokes callbacks only for actionable proposals', async () => {
    const actionable = buildProposal({
      id: 'actionable',
      title: 'Approve Workshop',
      cost: { grain: 10 },
      benefit: { coin: 5 },
    });

    const unaffordable = buildProposal({
      id: 'unaffordable',
      title: 'Lavish Festival',
      cost: { grain: 80 },
      benefit: { favor: 10 },
    });

    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onScry = vi.fn();
    const onGenerate = vi.fn();
    const onClose = vi.fn();

    render(
      <CouncilPanel
        isOpen
        onClose={onClose}
        proposals={[actionable, unaffordable]}
        currentResources={resources}
        onAcceptProposal={onAccept}
        onRejectProposal={onReject}
        onScryProposal={onScry}
        onGenerateProposals={onGenerate}
        canGenerateProposals
      />,
    );

    const acceptButtons = await screen.findAllByRole('button', { name: /Accept/ });

    fireEvent.click(acceptButtons[0]);
    expect(onAccept).toHaveBeenCalledWith('actionable');

    fireEvent.click(acceptButtons[1]);
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(acceptButtons[1].getAttribute('disabled')).not.toBeNull();
  });
});
