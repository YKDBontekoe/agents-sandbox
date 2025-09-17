import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GameResources } from './types';
import { ProposalCard } from './panels/council/ProposalCard';
import { useCouncilPanel } from './panels/council/useCouncilPanel';
import type { CategoryType } from '@arcane/ui';

export interface ProposalDelta {
  grain?: number;
  coin?: number;
  mana?: number;
  favor?: number;
  unrest?: number;
  threat?: number;
}

export interface CouncilProposal {
  id: string;
  title: string;
  description: string;
  type: CategoryType;
  cost: ProposalDelta;
  benefit: ProposalDelta;
  risk: number; // 0-100 percentage
  duration: number; // cycles to complete
  requirements?: string[];
  canScry: boolean;
  scryResult?: {
    successChance: number;
    hiddenEffects?: string[];
  };
  status?: 'pending' | 'accepted' | 'rejected' | 'applied';
}

export interface CouncilPanelProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: CouncilProposal[];
  currentResources: GameResources;
  onAcceptProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onScryProposal: (proposalId: string) => void;
  onGenerateProposals: () => void;
  canGenerateProposals: boolean;
}

export const CouncilPanel: React.FC<CouncilPanelProps> = ({
  isOpen,
  onClose,
  proposals,
  currentResources,
  onAcceptProposal,
  onRejectProposal,
  onScryProposal,
  onGenerateProposals,
  canGenerateProposals
}) => {
  const { viewModels } = useCouncilPanel({ proposals, currentResources });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] data-[state=open]:opacity-100 data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[state=open]:animate-fade-in"
        />
        <Dialog.Content
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:data-[state=open]:animate-scale-in"
        >
          <div className="bg-gray-800 text-gray-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <Dialog.Title className="text-xl font-bold text-gray-100">
                  Council Chamber
                </Dialog.Title>
                <Dialog.Description className="text-gray-400 text-sm">
                  Review and decide on proposals from your advisors
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateProposals}
                disabled={!canGenerateProposals}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  canGenerateProposals
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                📜 Summon Proposals
              </button>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-100 transition-colors">
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-gray-800">
            {viewModels.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-medium text-gray-100 mb-2">No Active Proposals</h3>
                <p className="text-gray-400 mb-4">
                  The council chamber is quiet. Summon your advisors to generate new proposals.
                </p>
                <button
                  onClick={onGenerateProposals}
                  disabled={!canGenerateProposals}
                  className={`px-6 py-3 rounded font-medium transition-colors ${
                    canGenerateProposals
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
              >
                📜 Summon Proposals
              </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {viewModels.map((viewModel) => (
                  <ProposalCard
                    key={viewModel.proposal.id}
                    proposal={viewModel.proposal}
                    typeClassName={viewModel.typeClassName}
                    canAfford={viewModel.canAfford}
                    meetsRequirements={viewModel.meetsRequirements}
                    isActionable={viewModel.isActionable}
                    isPending={viewModel.isPending}
                    showScryButton={viewModel.showScryButton}
                    disableReasons={viewModel.disableReasons}
                    onAccept={() => onAcceptProposal(viewModel.proposal.id)}
                    onReject={() => onRejectProposal(viewModel.proposal.id)}
                    onScry={() => onScryProposal(viewModel.proposal.id)}
                  />
                ))}
              </div>
            )}
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CouncilPanel;
