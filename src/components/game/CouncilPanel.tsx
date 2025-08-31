import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GameResources } from './GameHUD';
import { getResourceIcon, getResourceColor } from './resourceUtils';

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
  type: 'economic' | 'military' | 'diplomatic' | 'mystical' | 'infrastructure';
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

const ResourceDelta: React.FC<{ delta: ProposalDelta; type: 'cost' | 'benefit' }> = ({ delta, type: _type }) => {
  const entries = Object.entries(delta).filter(([_, value]) => value !== 0 && value !== undefined);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([resource, value]) => (
        <div key={resource} className="flex items-center gap-1">
          <span className="text-xs">{getResourceIcon(resource as keyof GameResources)}</span>
          <span className={`text-xs font-mono ${getResourceColor(resource as keyof GameResources)}`}>
            {value as number > 0 ? '+' : ''}{value}
          </span>
        </div>
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
  const getTypeColor = (type: CouncilProposal['type']) => {
    switch (type) {
      case 'economic': return 'bg-yellow-600';
      case 'military': return 'bg-red-600';
      case 'diplomatic': return 'bg-blue-600';
      case 'mystical': return 'bg-purple-600';
      case 'infrastructure': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getTypeIcon = (type: CouncilProposal['type']) => {
    switch (type) {
      case 'economic': return '💰';
      case 'military': return '⚔️';
      case 'diplomatic': return '🤝';
      case 'mystical': return '🔮';
      case 'infrastructure': return '🏗️';
      default: return '📋';
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

  const isActionable = canAfford() && meetsRequirements();

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(proposal.type)}`}>
            {getTypeIcon(proposal.type)} {proposal.type.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Risk:</span>
            <span className={`text-xs font-medium ${
              proposal.risk < 30 ? 'text-green-400' : 
              proposal.risk < 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {proposal.risk}%
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {proposal.duration} cycle{proposal.duration !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-white font-medium mb-2">{proposal.title}</h3>
      <p className="text-gray-300 text-sm mb-3">{proposal.description}</p>

      {/* Requirements */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Requirements:</div>
          <ul className="text-xs text-gray-300 list-disc list-inside">
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
        <div className="bg-purple-900/30 rounded p-2 mb-3">
          <div className="text-xs text-purple-300 mb-1">🔮 Scry Results:</div>
          <div className="text-xs text-purple-200 mb-1">
            Success Chance: {proposal.scryResult.successChance}%
          </div>
          {proposal.scryResult.hiddenEffects && (
            <div className="text-xs text-purple-200">
              Hidden Effects: {proposal.scryResult.hiddenEffects.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {proposal.canScry && !proposal.scryResult && (
          <button
            onClick={onScry}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
          >
            🔮 Scry
          </button>
        )}
        <button
          onClick={onAccept}
          disabled={!isActionable}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            isActionable
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✓ Accept
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
        >
          ✗ Reject
        </button>
      </div>

      {/* Affordability Warning */}
      {!canAfford() && (
        <div className="mt-2 text-xs text-red-400">
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
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <Dialog.Title className="text-xl font-bold text-white">
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
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                📜 Summon Proposals
              </button>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-medium text-white mb-2">No Active Proposals</h3>
                <p className="text-gray-400 mb-4">
                  The council chamber is quiet. Summon your advisors to generate new proposals.
                </p>
                <button
                  onClick={onGenerateProposals}
                  disabled={!canGenerateProposals}
                  className={`px-6 py-3 rounded font-medium transition-colors ${
                    canGenerateProposals
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default CouncilPanel;