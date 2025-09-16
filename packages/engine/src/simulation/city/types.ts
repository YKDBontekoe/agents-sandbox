export interface CityConfig {
  gridWidth: number;
  gridHeight: number;
  initialPopulation: number;
  startingBudget: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface CityMetrics {
  population: number;
  happiness: number;
  traffic: number;
  pollution: number;
  crime: number;
  education: number;
  healthcare: number;
  employment: number;
  budget: number;
  income: number;
  expenses: number;
}

export type CityMetricKey = keyof CityMetrics;

export type CityMetricDelta = Partial<Record<CityMetricKey, number>>;

export interface CityEvent {
  id: string;
  type: 'disaster' | 'economic' | 'social' | 'infrastructure';
  title: string;
  description: string;
  impact: Partial<CityMetrics>;
  duration: number;
  startTime: number;
}

export interface CityPosition {
  x: number;
  y: number;
}

export interface CityCitizen {
  id: string;
  homeId?: string;
  homePosition?: CityPosition;
  workId?: string;
  workPosition?: CityPosition;
  needsTransport?: boolean;
  needsWork?: boolean;
  satisfaction?: number;
  path?: unknown;
  transportMode?: string;
  [key: string]: unknown;
}

export interface CityBuilding {
  id: string;
  type: string;
  x: number;
  y: number;
  zoneType?: string;
  baseEfficiency?: number;
  efficiency?: number;
  population?: number;
  needsUpgrade?: boolean;
  upgrading?: boolean;
  upgradeTarget?: string;
  upgradeTime?: number;
  serviceType?: string;
  [key: string]: unknown;
}
