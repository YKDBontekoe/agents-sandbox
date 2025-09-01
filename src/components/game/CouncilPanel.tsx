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
      case 'economic': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'military': return 'bg-red-100 text-red-800 border border-red-200';
      case 'diplomatic': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'mystical': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'infrastructure': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
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

  const isActionable = canAfford() && meetsRequirements() && (proposal.status ?? 'pending') === 'pending';

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(proposal.type)}`}>
            {getTypeIcon(proposal.type)} {proposal.type.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Risk:</span>
            <span className={`text-xs font-medium ${
              proposal.risk < 30 ? 'text-emerald-600' : 
              proposal.risk < 70 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {proposal.risk}%
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {proposal.duration} cycle{proposal.duration !== 1 ? 's' : ''}
          {proposal.status && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              proposal.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              proposal.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
              proposal.status === 'applied' ? 'bg-slate-50 text-slate-600 border-slate-200' :
              'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {proposal.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-slate-900 font-medium mb-2">{proposal.title}</h3>
      <p className="text-slate-600 text-sm mb-3">{proposal.description}</p>

      {/* Requirements */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-1">Requirements:</div>
          <ul className="text-xs text-slate-600 list-disc list-inside">
            {proposal.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost and Benefits */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Cost:</div>
          <ResourceDelta delta={proposal.cost} type="cost" />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Benefit:</div>
          <ResourceDelta delta={proposal.benefit} type="benefit" />
        </div>
      </div>

      {/* Scry Results */}
      {proposal.scryResult && (
        <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-3">
          <div className="text-xs text-purple-700 mb-1">🔮 Scry Results:</div>
          <div className="text-xs text-purple-700 mb-1">
            Success Chance: {proposal.scryResult.successChance}%
          </div>
          {proposal.scryResult.hiddenEffects && (
            <div className="text-xs text-purple-700">
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
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          ✓ Accept
        </button>
        <button
          onClick={onReject}
          disabled={(proposal.status ?? 'pending') !== 'pending'}
          className={`px-3 py-1 text-white text-xs rounded transition-colors ${
            (proposal.status ?? 'pending') === 'pending' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          ✗ Reject
        </button>
      </div>

      {/* Affordability Warning */}
      {!canAfford() && (
        <div className="mt-2 text-xs text-red-600">
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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <Dialog.Title className="text-xl font-bold text-slate-900">
                  Council Chamber
                </Dialog.Title>
                <Dialog.Description className="text-slate-600 text-sm">
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
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                📜 Summon Proposals
              </button>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors">
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-white">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-medium text-slate-900 mb-2">No Active Proposals</h3>
                <p className="text-slate-600 mb-4">
                  The council chamber is quiet. Summon your advisors to generate new proposals.
                </p>
                <button
                  onClick={onGenerateProposals}
                  disabled={!canGenerateProposals}
                  className={`px-6 py-3 rounded font-medium transition-colors ${
                    canGenerateProposals
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
