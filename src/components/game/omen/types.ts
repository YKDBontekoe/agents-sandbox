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
