import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GameResources } from './types';
import { ResourceIcon } from '../ui';
import type { ResourceType } from '@/lib/resources';
import { CategoryIcon } from '../ui';
import { CategoryType } from '@/lib/categories';

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

const ResourceDelta: React.FC<{ delta: ProposalDelta; type: 'cost' | 'benefit' }> = ({ delta }) => {
  const entries = Object.entries(delta).filter(([, value]) => value !== 0 && value !== undefined);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([resource, value]) => (
        <ResourceIcon
          key={resource}
          type={resource as ResourceType}
          value={value as number}
          delta={value as number}
          className="text-xs"
        />
      ))}
    </div>
  );
};

const ProposalCard: React.FC<{
  proposal: CouncilProposal;
  currentResources: GameResources;
  onAccept: () => void;
  onReject: () => void;
  onScry: () => void;
}> = ({ proposal, currentResources, onAccept, onReject, onScry }) => {
  const getTypeColor = (type: CategoryType) => {
    switch (type) {
      case 'economic': return 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/60';
      case 'military': return 'bg-red-900/30 text-red-300 border border-red-700/60';
      case 'diplomatic': return 'bg-blue-900/30 text-blue-300 border border-blue-700/60';
      case 'mystical': return 'bg-purple-900/30 text-purple-300 border border-purple-700/60';
      case 'infrastructure': return 'bg-green-900/30 text-green-300 border border-green-700/60';
      case 'social': return 'bg-pink-900/30 text-pink-300 border border-pink-700/60';
      default: return 'bg-gray-900/30 text-gray-300 border border-gray-700/60';
    }
  };

  const canAfford = () => {
    return Object.entries(proposal.cost).every(([resource, cost]) => {
      if (cost === undefined || cost === 0) return true;
      const current = currentResources[resource as keyof GameResources];
      return current >= cost;
    });
  };

  const meetsRequirements = () => {
    // Simplified - in real game this would check actual requirements
    return !proposal.requirements || proposal.requirements.length === 0;
  };

  const isActionable = canAfford() && meetsRequirements() && (proposal.status ?? 'pending') === 'pending';

  return (
    <div className="bg-gray-900/50 text-gray-200 rounded-lg p-4 border border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(proposal.type)}`}>
            <CategoryIcon category={proposal.type} className="text-xs" /> {proposal.type.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Risk:</span>
            <span className={`text-xs font-medium ${
              proposal.risk < 30 ? 'text-success' :
              proposal.risk < 70 ? 'text-warning' : 'text-danger'
            }`}>
              {proposal.risk}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          {proposal.duration} cycle{proposal.duration !== 1 ? 's' : ''}
          {proposal.status && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              proposal.status === 'accepted' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/60' :
              proposal.status === 'rejected' ? 'bg-rose-900/30 text-rose-300 border-rose-700/60' :
              proposal.status === 'applied' ? 'bg-gray-800 text-gray-400 border-gray-700' :
              'bg-amber-900/30 text-amber-300 border-amber-700/60'
            }`}>
              {proposal.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-gray-100 font-medium mb-2">{proposal.title}</h3>
      <p className="text-gray-300 text-sm mb-3">{proposal.description}</p>

      {/* Requirements */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Requirements:</div>
          <ul className="text-xs text-gray-400 list-disc list-inside">
            {proposal.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost and Benefits */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Cost:</div>
          <ResourceDelta delta={proposal.cost} type="cost" />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Benefit:</div>
          <ResourceDelta delta={proposal.benefit} type="benefit" />
        </div>
      </div>

      {/* Scry Results */}
      {proposal.scryResult && (
        <div className="bg-blue-900/40 border border-blue-700 rounded p-2 mb-3">
          <div className="text-xs text-blue-200 mb-1">🔮 Scry Results:</div>
          <div className="text-xs text-blue-200 mb-1">
            Success Chance: {proposal.scryResult.successChance}%
          </div>
          {proposal.scryResult.hiddenEffects && (
            <div className="text-xs text-blue-200">
              Hidden Effects: {proposal.scryResult.hiddenEffects.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {proposal.canScry && !proposal.scryResult && (proposal.status ?? 'pending') === 'pending' && (
          <button
            onClick={onScry}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            🔮 Scry
          </button>
        )}
        <button
          onClick={onAccept}
          disabled={!isActionable}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            isActionable
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✓ Accept
        </button>
        <button
          onClick={onReject}
          disabled={(proposal.status ?? 'pending') !== 'pending'}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            (proposal.status ?? 'pending') === 'pending' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✗ Reject
        </button>
      </div>

      {/* Affordability Warning */}
      {!canAfford() && (
        <div className="mt-2 text-xs text-rose-400">
          ⚠️ Insufficient resources
        </div>
      )}
    </div>
  );
};

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
            {proposals.length === 0 ? (
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
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    currentResources={currentResources}
                    onAccept={() => onAcceptProposal(proposal.id)}
                    onReject={() => onRejectProposal(proposal.id)}
                    onScry={() => onScryProposal(proposal.id)}
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
