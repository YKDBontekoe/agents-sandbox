import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { SeasonIcon, EventTypeIcon } from './omen/icons';
import EventCard from './omen/EventCard';
import OmenReadingList from './omen/OmenReadingList';
import type { SeasonalEvent, OmenReading } from './omen/types';

export interface OmenPanelProps {
  isOpen: boolean;
  onClose: () => void;
  upcomingEvents: SeasonalEvent[];
  omenReadings: OmenReading[];
  currentCycle: number;
  currentSeason: SeasonalEvent['season'];
  onRequestReading?: () => void;
  canRequestReading: boolean;
  readingCost: number;
  currentMana: number;
}

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
      <h3 className="text-lg font-semibold text-gray-100 mb-4">📅 Timeline</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedEvents.map((event) => {
          const targetCycle = currentCycle + event.cycleOffset;
          const isImminent = event.cycleOffset <= 3;
          
          return (
            <div key={event.id} className={`flex items-center gap-3 p-2 rounded ${
              isImminent ? 'bg-amber-900/20' : 'bg-gray-900/20'
            }`}>
              <div className="text-xs font-mono text-gray-400 w-12">
                {targetCycle}
              </div>
              <SeasonIcon season={event.season} />
              <EventTypeIcon type={event.type} />
              <div className="flex-1">
                <div className={`text-sm ${
                  event.isRevealed ? 'text-gray-100' : 'text-gray-400'
                }`}>
                  {event.isRevealed ? event.name : 'Unknown Event'}
                </div>
              </div>
              <div className={`text-xs font-mono ${
                event.probability >= 80 ? 'text-rose-400' :
                event.probability >= 60 ? 'text-amber-400' :
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] data-[state=open]:opacity-100 data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:data-[state=open]:animate-fade-in"
        />
        <Dialog.Content
          className="card-elevated fixed inset-0 z-[110] flex items-center justify-center p-4 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:scale-95 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:data-[state=open]:animate-scale-in"
        >
          <div className="bg-gray-800 text-gray-200 backdrop-blur-sm w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔮</span>
              <div>
                <Dialog.Title className="text-heading-2 text-gray-100">
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
                        className={`text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors ${
                          canRequestReading && canAffordReading
                            ? ''
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        🔮 Divine Reading (✨ {readingCost})
                      </button>
                    </Tooltip.Trigger>
                    {(!canRequestReading || !canAffordReading) && (
                      <Tooltip.Portal>
                        <Tooltip.Content className="bg-gray-800 border border-gray-700 text-gray-200 px-2 py-1 rounded text-xs shadow-sm" sideOffset={5}>
                          {!canAffordReading ? 'Insufficient mana' : 'Reading not available'}
                          <Tooltip.Arrow className="fill-gray-800" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    )}
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
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
                    <h3 className="text-lg font-semibold text-gray-100 mb-4">🔍 Known Events</h3>
                    <div className="grid gap-4">
                      {revealedEvents
                        .filter(e => !imminentEvents.some(ie => ie.id === e.id))
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
                    <h3 className="text-lg font-semibold text-blue-400 mb-4">📜 Recent Visions</h3>
                    <OmenReadingList readings={omenReadings} currentCycle={currentCycle} />
                  </div>
                )}

                {/* Empty State */}
                {upcomingEvents.length === 0 && omenReadings.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔮</div>
                    <h3 className="text-xl font-medium text-gray-100 mb-2">The Future is Unclear</h3>
                    <p className="text-gray-400 mb-4">
                      The mists of time obscure what is to come. Request a divine reading to glimpse future events.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default OmenPanel;
