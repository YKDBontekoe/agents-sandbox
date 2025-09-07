import type { SimResources } from '../buildingCatalog';

export type EventType =
  | 'natural_disaster'
  | 'economic_boom'
  | 'resource_discovery'
  | 'plague_outbreak'
  | 'trade_opportunity'
  | 'technological_breakthrough'
  | 'social_unrest'
  | 'festival'
  | 'weather_change'
  | 'migration_wave'
  | 'construction_boom'
  | 'market_day'
  | 'cultural_event'
  | 'infrastructure_upgrade';

export type EventSeverity = 'minor' | 'moderate' | 'major' | 'critical';

export interface EventImpact {
  resources: Partial<SimResources>;
  citizenMood: {
    happiness: number;
    stress: number;
    motivation: number;
  };
  buildingEffects: {
    conditionChange: number;
    efficiencyMultiplier: number;
    maintenanceCostMultiplier: number;
  };
  economicEffects: {
    wageMultiplier: number;
    tradeMultiplier: number;
    growthRate: number;
  };
  duration: number;
  probability: number;
}

export interface EventDefinition {
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  impact: EventImpact;

  iconType: 'warning' | 'positive' | 'neutral' | 'critical';
  color: string;
  animationType: 'pulse' | 'shake' | 'glow' | 'bounce';

  responses?: Array<{
    id: string;
    label: string;
    cost: Partial<SimResources>;
    effect: Partial<EventImpact>;
    description: string;
  }>;

  triggers?: Array<{
    condition: string;
    eventType: EventType;
    probability: number;
  }>;
}

export interface ActiveEvent extends EventDefinition {
  id: string;
  startCycle: number;
  endCycle: number;
  isActive: boolean;
}

export interface SystemState {
  population: number;
  happiness: number;
  economicHealth: number;
  infrastructure: number;
  resources: number;
  stability: number;
}

export interface VisualIndicator {
  id: string;
  type: 'building_status' | 'citizen_mood' | 'resource_flow' | 'event_impact' | 'system_health';
  position: { x: number; y: number };
  value: number;
  change: number;
  color: string;
  icon: string;
  animation: string;
  duration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
