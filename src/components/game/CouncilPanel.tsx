import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { GameResources } from './GameHUD';
import { ResourceIcon } from '../ui';
import type { ResourceType } from '@/lib/resources';
import { getResourceIcon, getResourceColor } from './resourceUtils';
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

const ResourceDelta: React.FC<{ delta: ProposalDelta; type: 'cost' | 'benefit' }> = ({ delta, type: _type }) => {
  const entries = Object.entries(delta).filter(([_, value]) => value !== 0 && value !== undefined);

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
      case 'economic': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'military': return 'bg-red-100 text-red-800 border border-red-200';
      case 'diplomatic': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'mystical': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'infrastructure': return 'bg-green-100 text-green-800 border border-green-200';
      case 'social': return 'bg-pink-100 text-pink-800 border border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
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
    <div className="bg-panel rounded-lg p-4 border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(proposal.type)}`}>
            <CategoryIcon category={proposal.type} className="text-xs" /> {proposal.type.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">Risk:</span>
            <span className={`text-xs font-medium ${
              proposal.risk < 30 ? 'text-success' :
              proposal.risk < 70 ? 'text-warning' : 'text-danger'
            }`}>
              {proposal.risk}%
            </span>
          </div>
        </div>
        <div className="text-xs text-muted flex items-center gap-2">
          {proposal.duration} cycle{proposal.duration !== 1 ? 's' : ''}
          {proposal.status && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              proposal.status === 'accepted' ? 'bg-success text-inverse border-success' :
              proposal.status === 'rejected' ? 'bg-danger text-inverse border-danger' :
              proposal.status === 'applied' ? 'bg-panel text-muted border-border' :
              'bg-warning text-inverse border-warning'
            }`}>
              {proposal.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-foreground font-medium mb-2">{proposal.title}</h3>
      <p className="text-muted text-sm mb-3">{proposal.description}</p>

      {/* Requirements */}
      {proposal.requirements && proposal.requirements.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted mb-1">Requirements:</div>
          <ul className="text-xs text-muted list-disc list-inside">
            {proposal.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost and Benefits */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted mb-1">Cost:</div>
          <ResourceDelta delta={proposal.cost} type="cost" />
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Benefit:</div>
          <ResourceDelta delta={proposal.benefit} type="benefit" />
        </div>
      </div>

      {/* Scry Results */}
      {proposal.scryResult && (
        <div className="bg-accent border border-accent rounded p-2 mb-3">
          <div className="text-xs text-inverse mb-1">🔮 Scry Results:</div>
          <div className="text-xs text-inverse mb-1">
            Success Chance: {proposal.scryResult.successChance}%
          </div>
          {proposal.scryResult.hiddenEffects && (
            <div className="text-xs text-inverse">
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
            className="px-3 py-1 bg-accent hover:opacity-80 text-inverse text-xs rounded transition-colors"
          >
            🔮 Scry
          </button>
        )}
        <button
          onClick={onAccept}
          disabled={!isActionable}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            isActionable
              ? 'bg-success hover:opacity-80 text-inverse'
              : 'bg-muted text-muted cursor-not-allowed'
          }`}
        >
          ✓ Accept
        </button>
        <button
          onClick={onReject}
          disabled={(proposal.status ?? 'pending') !== 'pending'}
          className={`px-3 py-1 text-inverse text-xs rounded transition-colors ${
            (proposal.status ?? 'pending') === 'pending' ? 'bg-danger hover:opacity-80' : 'bg-muted text-muted cursor-not-allowed'
          }`}
        >
          ✗ Reject
        </button>
      </div>

      {/* Affordability Warning */}
      {!canAfford() && (
        <div className="mt-2 text-xs text-danger">
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[state=open]:animate-fade-in"
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-panel rounded-lg shadow-xl z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden border border-border data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:data-[state=open]:animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <Dialog.Title className="text-xl font-bold text-foreground">
                  Council Chamber
                </Dialog.Title>
                <Dialog.Description className="text-muted text-sm">
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
                    ? 'bg-primary hover:bg-secondary text-inverse'
                    : 'bg-muted text-muted cursor-not-allowed'
                }`}
              >
                📜 Summon Proposals
              </button>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-muted rounded text-muted hover:text-foreground transition-colors">
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-panel">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-medium text-foreground mb-2">No Active Proposals</h3>
                <p className="text-muted mb-4">
                  The council chamber is quiet. Summon your advisors to generate new proposals.
                </p>
                <button
                  onClick={onGenerateProposals}
                  disabled={!canGenerateProposals}
                  className={`px-6 py-3 rounded font-medium transition-colors ${
                    canGenerateProposals
                      ? 'bg-primary hover:bg-secondary text-inverse'
                      : 'bg-muted text-muted cursor-not-allowed'
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
