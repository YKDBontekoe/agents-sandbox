import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  type: 'blessing' | 'curse' | 'neutral' | 'crisis';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  cycleOffset: number; // cycles from now
  probability: number; // 0-100
  effects: {
    resource: string;
    impact: string;
  }[];
  duration?: number; // cycles, if ongoing
  isRevealed: boolean; // false for hidden/uncertain events
}

export interface OmenReading {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  revealedAt: number; // cycle when this was revealed
  events: string[]; // event IDs this reading hints at
}

export interface OmenPanelProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingEvents: SeasonalEvent[];
  omenReadings: OmenReading[];
  currentCycle: number;
  currentSeason: string;
  onRequestReading?: () => void;
  canRequestReading: boolean;
  readingCost: number;
  currentMana: number;
}

const SeasonIcon: React.FC<{ season: SeasonalEvent['season'] }> = ({ season }) => {
  const icons = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️'
  };
  return <span>{icons[season]}</span>;
};

const EventTypeIcon: React.FC<{ type: SeasonalEvent['type'] }> = ({ type }) => {
  const icons = {
    blessing: '✨',
    curse: '💀',
    neutral: '⚖️',
    crisis: '🔥'
  };
  return <span>{icons[type]}</span>;
};

const EventCard: React.FC<{
  event: SeasonalEvent;
  currentCycle: number;
}> = ({ event, currentCycle }) => {
  const targetCycle = currentCycle + event.cycleOffset;
  const isImminent = event.cycleOffset <= 3;
  const isDistant = event.cycleOffset > 10;

  const getTypeColor = (type: SeasonalEvent['type']) => {
    switch (type) {
      case 'blessing': return 'border-green-500 bg-green-900/20';
      case 'curse': return 'border-red-500 bg-red-900/20';
      case 'crisis': return 'border-orange-500 bg-orange-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-red-400';
    if (probability >= 60) return 'text-yellow-400';
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
              event.isRevealed ? 'text-white' : 'text-gray-400'
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
            <div className="text-xs text-yellow-400 font-medium">
              IMMINENT
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm mb-3 ${
        event.isRevealed ? 'text-gray-300' : 'text-gray-500 italic'
      }`}>
        {event.isRevealed ? event.description : 'The future remains shrouded in mystery...'}
      </p>

      {/* Effects */}
      {event.isRevealed && event.effects.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400">Predicted Effects:</div>
          {event.effects.map((effect, index) => (
            <div key={index} className="text-xs text-gray-300 flex items-center gap-2">
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

const OmenReadingCard: React.FC<{
  reading: OmenReading;
  currentCycle: number;
}> = ({ reading, currentCycle }) => {
  const age = currentCycle - reading.revealedAt;
  const isRecent = age <= 2;
  const isStale = age > 5;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    if (confidence >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 ${
      isRecent ? 'ring-1 ring-purple-400/50' : ''
    } ${isStale ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h3 className="text-purple-200 font-medium">{reading.title}</h3>
        </div>
        <div className="text-right">
          <div className={`text-xs font-mono ${getConfidenceColor(reading.confidence)}`}>
            {reading.confidence}% confidence
          </div>
          <div className="text-xs text-gray-400">
            Cycle {reading.revealedAt}
          </div>
        </div>
      </div>
      <p className="text-purple-100 text-sm italic">
        &ldquo;{reading.description}&rdquo;
      </p>
      {isRecent && (
        <div className="mt-2 text-xs text-purple-300">
          ✨ Recent vision
        </div>
      )}
    </div>
  );
};

const TimelineView: React.FC<{
  events: SeasonalEvent[];
  currentCycle: number;
}> = ({ events, currentCycle }) => {
  const sortedEvents = [...events]
    .filter(e => e.cycleOffset >= 0)
    .sort((a, b) => a.cycleOffset - b.cycleOffset)
    .slice(0, 12); // Show next 12 events

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white mb-4">📅 Timeline</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedEvents.map((event) => {
          const targetCycle = currentCycle + event.cycleOffset;
          const isImminent = event.cycleOffset <= 3;
          
          return (
            <div key={event.id} className={`flex items-center gap-3 p-2 rounded ${
              isImminent ? 'bg-yellow-900/20' : 'bg-gray-800/50'
            }`}>
              <div className="text-xs font-mono text-gray-400 w-12">
                {targetCycle}
              </div>
              <SeasonIcon season={event.season} />
              <EventTypeIcon type={event.type} />
              <div className="flex-1">
                <div className={`text-sm ${
                  event.isRevealed ? 'text-white' : 'text-gray-400'
                }`}>
                  {event.isRevealed ? event.name : 'Unknown Event'}
                </div>
              </div>
              <div className={`text-xs font-mono ${
                event.probability >= 80 ? 'text-red-400' :
                event.probability >= 60 ? 'text-yellow-400' :
                event.probability >= 40 ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {event.probability}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OmenPanel: React.FC<OmenPanelProps> = ({
  isOpen,
  onClose,
  upcomingEvents,
  omenReadings,
  currentCycle,
  currentSeason,
  onRequestReading,
  canRequestReading,
  readingCost,
  currentMana
}) => {
  const revealedEvents = upcomingEvents.filter(e => e.isRevealed);
  const hiddenEvents = upcomingEvents.filter(e => !e.isRevealed);
  const imminentEvents = upcomingEvents.filter(e => e.cycleOffset <= 3);
  const canAffordReading = currentMana >= readingCost;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-lg shadow-xl z-50 w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔮</span>
              <div>
                <Dialog.Title className="text-xl font-bold text-white">
                  Omen Readings
                </Dialog.Title>
                <Dialog.Description className="text-gray-400 text-sm">
                  Glimpses of future seasons and events • Current: {currentSeason} (Cycle {currentCycle})
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {onRequestReading && (
                <Tooltip.Provider>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        onClick={onRequestReading}
                        disabled={!canRequestReading || !canAffordReading}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          canRequestReading && canAffordReading
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        🔮 Divine Reading (✨ {readingCost})
                      </button>
                    </Tooltip.Trigger>
                    {(!canRequestReading || !canAffordReading) && (
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="bg-gray-900 text-white px-2 py-1 rounded text-xs"
                          sideOffset={5}
                        >
                          {!canAffordReading ? 'Insufficient mana' : 'Reading not available'}
                          <Tooltip.Arrow className="fill-gray-900" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    )}
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
                  ✕
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline */}
              <div className="lg:col-span-1">
                <TimelineView events={upcomingEvents} currentCycle={currentCycle} />
              </div>

              {/* Events */}
              <div className="lg:col-span-2 space-y-6">
                {/* Imminent Events */}
                {imminentEvents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                      ⚠️ Imminent Events
                    </h3>
                    <div className="grid gap-4">
                      {imminentEvents.map(event => (
                        <EventCard key={event.id} event={event} currentCycle={currentCycle} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Revealed Events */}
                {revealedEvents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">🔍 Known Events</h3>
                    <div className="grid gap-4">
                      {revealedEvents
                        .filter(e => !imminentEvents.includes(e))
                        .slice(0, 6)
                        .map(event => (
                          <EventCard key={event.id} event={event} currentCycle={currentCycle} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Hidden Events */}
                {hiddenEvents.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-4">❓ Mysterious Portents</h3>
                    <div className="grid gap-4">
                      {hiddenEvents.slice(0, 3).map(event => (
                        <EventCard key={event.id} event={event} currentCycle={currentCycle} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Omen Readings */}
                {omenReadings.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-purple-300 mb-4">📜 Recent Visions</h3>
                    <div className="space-y-3">
                      {omenReadings
                        .sort((a, b) => b.revealedAt - a.revealedAt)
                        .slice(0, 5)
                        .map(reading => (
                          <OmenReadingCard key={reading.id} reading={reading} currentCycle={currentCycle} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {upcomingEvents.length === 0 && omenReadings.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔮</div>
                    <h3 className="text-xl font-medium text-white mb-2">The Future is Unclear</h3>
                    <p className="text-gray-400 mb-4">
                      The mists of time obscure what is to come. Request a divine reading to glimpse future events.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OmenPanel;