import type { ActiveEvent, EventImpact } from '@engine';

type EventSeason = 'spring' | 'summer' | 'autumn' | 'winter';
type EventDisplayType = 'blessing' | 'curse' | 'neutral' | 'crisis';
type EventSeverity = ActiveEvent['severity'];
type EventIcon = ActiveEvent['iconType'];
type EventSourceType = ActiveEvent['type'];

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  type: EventDisplayType;
  season: EventSeason;
  cycleOffset: number; // cycles from now
  probability: number; // 0-100
  effects: {
    resource: string;
    impact: string;
  }[];
  duration?: number; // cycles, if ongoing
  isRevealed: boolean; // false for hidden/uncertain events
  severity: EventSeverity;
  iconType: EventIcon;
  color: string;
  animationType: ActiveEvent['animationType'];
  startCycle: number;
  endCycle: number;
  isActive: boolean;
  sourceEventType: EventSourceType;
  impact: EventImpact;
  responses?: ActiveEvent['responses'];
  triggers?: ActiveEvent['triggers'];
}

export interface OmenReading {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  revealedAt: number; // cycle when this was revealed
  events: string[]; // event IDs this reading hints at
  relatedEventType?: EventSourceType;
  severity?: EventSeverity;
  iconType?: EventIcon;
  color?: string;
}
