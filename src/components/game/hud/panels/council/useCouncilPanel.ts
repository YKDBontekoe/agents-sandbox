import { useMemo } from 'react';
import type { CategoryType } from '@arcane/ui';
import type { CouncilProposal } from '../../CouncilPanel';
import type { GameResources } from '../../types';

export interface ProposalDisableReasons {
  accept?: string;
  reject?: string;
  scry?: string;
}

export interface ProposalViewModel {
  proposal: CouncilProposal;
  typeClassName: string;
  canAfford: boolean;
  meetsRequirements: boolean;
  isPending: boolean;
  isActionable: boolean;
  showScryButton: boolean;
  disableReasons: ProposalDisableReasons;
}

const typeClassNames: Partial<Record<CategoryType, string>> = {
  economic: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/60',
  military: 'bg-red-900/30 text-red-300 border border-red-700/60',
  diplomatic: 'bg-blue-900/30 text-blue-300 border border-blue-700/60',
  mystical: 'bg-purple-900/30 text-purple-300 border border-purple-700/60',
  infrastructure: 'bg-green-900/30 text-green-300 border border-green-700/60',
  social: 'bg-pink-900/30 text-pink-300 border border-pink-700/60',
};

const fallbackTypeClassName = 'bg-gray-900/30 text-gray-300 border border-gray-700/60';

const getTypeClassName = (type: CategoryType): string => typeClassNames[type] ?? fallbackTypeClassName;

const calculateAffordability = (proposal: CouncilProposal, currentResources: GameResources): boolean => {
  return Object.entries(proposal.cost).every(([resource, cost]) => {
    if (cost === undefined || cost === 0) return true;

    const current = currentResources[resource as keyof GameResources];
    return current !== undefined && current >= cost;
  });
};

const meetsRequirements = (proposal: CouncilProposal): boolean => {
  return !proposal.requirements || proposal.requirements.length === 0;
};

const deriveDisableReasons = (
  {
    isPending,
    canAfford,
    meetsRequirements: requirementsMet,
    proposal,
  }: {
    isPending: boolean;
    canAfford: boolean;
    meetsRequirements: boolean;
    proposal: CouncilProposal;
  },
): ProposalDisableReasons => {
  const reasons: ProposalDisableReasons = {};

  if (!isPending) {
    reasons.accept = 'Proposal already resolved';
    reasons.reject = 'Proposal already resolved';
  } else {
    if (!canAfford) {
      reasons.accept = 'Insufficient resources';
    } else if (!requirementsMet) {
      reasons.accept = 'Requirements not met';
    }
  }

  if (!proposal.canScry) {
    reasons.scry = 'Scrying unavailable';
  } else if (!isPending) {
    reasons.scry = 'Proposal already resolved';
  } else if (proposal.scryResult) {
    reasons.scry = 'Already scryed';
  }

  return reasons;
};

interface UseCouncilPanelOptions {
  proposals: CouncilProposal[];
  currentResources: GameResources;
}

export const useCouncilPanel = ({ proposals, currentResources }: UseCouncilPanelOptions) => {
  const viewModels = useMemo<ProposalViewModel[]>(() => {
    return proposals.map((proposal) => {
      const isPending = (proposal.status ?? 'pending') === 'pending';
      const canAfford = calculateAffordability(proposal, currentResources);
      const requirementsMet = meetsRequirements(proposal);
      const disableReasons = deriveDisableReasons({
        isPending,
        canAfford,
        meetsRequirements: requirementsMet,
        proposal,
      });

      return {
        proposal,
        typeClassName: getTypeClassName(proposal.type),
        canAfford,
        meetsRequirements: requirementsMet,
        isPending,
        isActionable: isPending && canAfford && requirementsMet,
        showScryButton: proposal.canScry && !proposal.scryResult && isPending,
        disableReasons,
      } satisfies ProposalViewModel;
    });
  }, [proposals, currentResources]);

  const pendingStates = useMemo(() => {
    return viewModels.reduce<Record<string, boolean>>((acc, viewModel) => {
      acc[viewModel.proposal.id] = viewModel.isPending;
      return acc;
    }, {});
  }, [viewModels]);

  return { viewModels, pendingStates };
};

export default useCouncilPanel;
