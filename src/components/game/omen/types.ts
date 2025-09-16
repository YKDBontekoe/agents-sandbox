import type { EventImpact } from '@engine';

export interface SeasonalEventResponse {
  id: string;
  label: string;
  description: string;
  cost: Partial<Record<string, number>>;
  effect?: Partial<EventImpact>;
  effectHints: string[];
  isAffordable: boolean;
  missingResources: string[];
}

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
  responses?: SeasonalEventResponse[];
}

export interface OmenReading {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  revealedAt: number; // cycle when this was revealed
  events: string[]; // event IDs this reading hints at
}
