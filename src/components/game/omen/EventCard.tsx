import React from 'react';
import type { SeasonalEvent } from './types';
import { EventTypeIcon, SeasonIcon } from './icons';

interface EventCardProps {
  event: SeasonalEvent;
  currentCycle: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, currentCycle }) => {
  const targetCycle = currentCycle + event.cycleOffset;
  const isImminent = event.cycleOffset <= 3;
  const isDistant = event.cycleOffset > 10;

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
    </div>
  );
};

export default EventCard;
