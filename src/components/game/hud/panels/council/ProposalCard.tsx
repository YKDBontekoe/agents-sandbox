import React from 'react';
import { CategoryIcon, ResourceIcon, type ResourceType } from '@arcane/ui';
import type { CouncilProposal, ProposalDelta } from '../../CouncilPanel';
import type { ProposalDisableReasons } from './useCouncilPanel';

const ResourceDelta: React.FC<{ delta: ProposalDelta }> = ({ delta }) => {
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

export interface ProposalCardProps {
  proposal: CouncilProposal;
  onAccept: () => void;
  onReject: () => void;
  onScry: () => void;
  typeClassName: string;
  canAfford: boolean;
  meetsRequirements: boolean;
  isActionable: boolean;
  isPending: boolean;
  showScryButton: boolean;
  disableReasons: ProposalDisableReasons;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  onAccept,
  onReject,
  onScry,
  typeClassName,
  canAfford,
  meetsRequirements,
  isActionable,
  isPending,
  showScryButton,
  disableReasons,
}) => {
  const riskClassName =
    proposal.risk < 30 ? 'text-success' : proposal.risk < 70 ? 'text-warning' : 'text-danger';

  const shouldShowRequirements = proposal.requirements && proposal.requirements.length > 0;

  const disableMessage = !isActionable ? disableReasons.accept : undefined;
  const disableMessageClass = !canAfford
    ? 'text-rose-400'
    : !meetsRequirements
      ? 'text-amber-300'
      : 'text-rose-400';

  return (
    <div className="bg-gray-900/50 text-gray-200 rounded-lg p-4 border border-gray-700 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${typeClassName}`}>
            <CategoryIcon category={proposal.type} className="text-xs" /> {proposal.type.toUpperCase()}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Risk:</span>
            <span className={`text-xs font-medium ${riskClassName}`}>{proposal.risk}%</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          {proposal.duration} cycle{proposal.duration !== 1 ? 's' : ''}
          {proposal.status && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                proposal.status === 'accepted'
                  ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/60'
                  : proposal.status === 'rejected'
                    ? 'bg-rose-900/30 text-rose-300 border-rose-700/60'
                    : proposal.status === 'applied'
                      ? 'bg-gray-800 text-gray-400 border-gray-700'
                      : 'bg-amber-900/30 text-amber-300 border-amber-700/60'
              }`}
            >
              {proposal.status.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-gray-100 font-medium mb-2">{proposal.title}</h3>
      <p className="text-gray-300 text-sm mb-3">{proposal.description}</p>

      {shouldShowRequirements && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Requirements:</div>
          <ul className="text-xs text-gray-400 list-disc list-inside">
            {proposal.requirements!.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">Cost:</div>
          <ResourceDelta delta={proposal.cost} />
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Benefit:</div>
          <ResourceDelta delta={proposal.benefit} />
        </div>
      </div>

      {proposal.scryResult && (
        <div className="bg-blue-900/40 border border-blue-700 rounded p-2 mb-3">
          <div className="text-xs text-blue-200 mb-1">🔮 Scry Results:</div>
          <div className="text-xs text-blue-200 mb-1">Success Chance: {proposal.scryResult.successChance}%</div>
          {proposal.scryResult.hiddenEffects && (
            <div className="text-xs text-blue-200">
              Hidden Effects: {proposal.scryResult.hiddenEffects.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {showScryButton && (
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
            isActionable ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✓ Accept
        </button>
        <button
          onClick={onReject}
          disabled={!isPending}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            isPending ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          ✗ Reject
        </button>
      </div>

      {disableMessage && (
        <div className={`mt-2 text-xs ${disableMessageClass}`}>⚠️ {disableMessage}</div>
      )}
    </div>
  );
};

export default ProposalCard;
