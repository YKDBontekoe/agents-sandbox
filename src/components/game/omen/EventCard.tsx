import React from 'react';
import type { SeasonalEvent } from './types';
import { EventTypeIcon, SeasonIcon } from './icons';

interface EventCardProps {
  event: SeasonalEvent;
  currentCycle: number;
  onRespond?: (eventId: string, responseId: string) => void | Promise<void>;
  pendingResponse?: { eventId: string; responseId: string } | null;
}

const formatResourceKey = (key: string) => {
  switch (key) {
    case 'grain': return 'Grain';
    case 'coin': return 'Coin';
    case 'mana': return 'Mana';
    case 'favor': return 'Favor';
    case 'wood': return 'Wood';
    case 'planks': return 'Planks';
    case 'workers': return 'Workers';
    case 'happiness': return 'Happiness';
    case 'stress': return 'Stress';
    case 'motivation': return 'Motivation';
    case 'conditionChange': return 'Condition';
    case 'efficiencyMultiplier': return 'Efficiency';
    case 'maintenanceCostMultiplier': return 'Maintenance';
    case 'growthRate': return 'Growth Rate';
    case 'tradeMultiplier': return 'Trade';
    case 'wageMultiplier': return 'Wages';
    default:
      return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

const EventCard: React.FC<EventCardProps> = ({
  event,
  currentCycle,
  onRespond,
  pendingResponse,
}) => {
  const targetCycle = currentCycle + event.cycleOffset;
  const isImminent = event.cycleOffset <= 3;
  const isDistant = event.cycleOffset > 10;
  const pendingResponseId = pendingResponse?.eventId === event.id ? pendingResponse?.responseId : null;

  const getTypeColor = (type: SeasonalEvent['type']) => {
    switch (type) {
      case 'blessing': return 'border-emerald-700/60 bg-emerald-900/20';
      case 'curse': return 'border-rose-700/60 bg-rose-900/20';
      case 'crisis': return 'border-amber-700/60 bg-amber-900/20';
      default: return 'border-gray-700 bg-gray-900/20';
      }
    };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-rose-400';
    if (probability >= 60) return 'text-amber-400';
    if (probability >= 40) return 'text-blue-400';
    return 'text-gray-400';
  };

  return (
    <div className={`rounded-lg p-4 border-2 ${
      getTypeColor(event.type)
    } ${isImminent ? 'ring-2 ring-yellow-500/50' : ''} ${
      isDistant ? 'opacity-60' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <EventTypeIcon type={event.type} />
          <SeasonIcon season={event.season} />
          <div>
            <h3 className={`font-medium ${
              event.isRevealed ? 'text-gray-100' : 'text-gray-400'
            }`}>
              {event.isRevealed ? event.name : '???'}
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Cycle {targetCycle}</span>
              <span className="text-gray-500">•</span>
              <span className="capitalize text-gray-400">{event.season}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-mono ${getProbabilityColor(event.probability)}`}>
            {event.probability}%
          </div>
          {isImminent && (
            <div className="text-xs text-amber-400 font-medium">
              IMMINENT
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm mb-3 ${
        event.isRevealed ? 'text-gray-300' : 'text-gray-400 italic'
      }`}>
        {event.isRevealed ? event.description : 'The future remains shrouded in mystery...'}
      </p>

      {/* Effects */}
      {event.isRevealed && event.effects.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Predicted Effects:</div>
          {event.effects.map((effect, index) => (
            <div key={`${effect.resource}-${index}`} className="text-xs text-gray-300 flex items-center gap-2">
              <span className="text-blue-400">{effect.resource}:</span>
              <span>{effect.impact}</span>
            </div>
          ))}
        </div>
      )}

      {/* Duration */}
      {event.duration && event.duration > 1 && (
        <div className="mt-2 text-xs text-gray-400">
          Duration: {event.duration} cycles
        </div>
      )}

      {/* Response options */}
      {event.responses && event.responses.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-gray-400">Possible Responses</div>
          {event.responses.map((response) => {
            const costEntries = Object.entries(response.cost || {}).filter(([, value]) => (value ?? 0) > 0);
            const isPending = pendingResponseId === response.id;
            const isDisabled = !onRespond || isPending || !response.isAffordable;

            return (
              <div
                key={response.id}
                className="border border-gray-700/70 bg-gray-900/30 rounded-md p-3 space-y-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-100">{response.label}</div>
                    {response.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {response.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`self-start text-xs px-3 py-1.5 rounded border transition-colors ${
                      isDisabled
                        ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'border-blue-500/60 text-blue-300 hover:bg-blue-500/10'
                    }`}
                    onClick={() => { if (!isDisabled) void onRespond?.(event.id, response.id); }}
                    disabled={isDisabled}
                  >
                    {isPending ? 'Applying…' : 'Select Response'}
                  </button>
                </div>

                {costEntries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {costEntries.map(([resource, amount]) => (
                      <span
                        key={`${response.id}-cost-${resource}`}
                        className={`text-[11px] px-2 py-1 rounded-full border ${
                          response.isAffordable ? 'border-amber-500/50 text-amber-200 bg-amber-900/20' : 'border-rose-500/50 text-rose-200 bg-rose-900/10'
                        }`}
                      >
                        {formatResourceKey(resource)} −{Math.abs(Number(amount ?? 0))}
                      </span>
                    ))}
                  </div>
                )}

                {response.effectHints.length > 0 && (
                  <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
                    {response.effectHints.map((hint, idx) => (
                      <li key={`${response.id}-effect-${idx}`}>{hint}</li>
                    ))}
                  </ul>
                )}

                {!response.isAffordable && response.missingResources.length > 0 && (
                  <div className="text-xs text-rose-300">
                    Requires more: {response.missingResources.map(formatResourceKey).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventCard;
