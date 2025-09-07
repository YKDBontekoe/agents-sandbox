export type ZoneType = 'residential' | 'commercial' | 'industrial' | 'office' | 'mixed' | 'special' | 'unzoned';

export interface ZoneCell {
  x: number;
  y: number;
  type: ZoneType;
  density: 'low' | 'medium' | 'high';
  level: number; // 1-5, represents development level
  demand: number; // -100 to 100, negative = oversupply, positive = demand
  pollution: number; // 0-100
  landValue: number; // 0-1000
  services: {
    power: boolean;
    water: boolean;
    sewage: boolean;
    garbage: boolean;
    fire: boolean;
    police: boolean;
    healthcare: boolean;
    education: boolean;
  };
  happiness: number; // 0-100
  lastUpdate: number;
}

export interface ZoneRequirements {
  minLandValue: number;
  maxPollution: number;
  requiredServices: Array<keyof ZoneCell['services']>;
  roadAccess: boolean;
  minDensity: ZoneCell['density'];
  maxDensity: ZoneCell['density'];
}

export interface ZoneDemand {
  residential: {
    low: number;
    medium: number;
    high: number;
  };
  commercial: {
    low: number;
    medium: number;
    high: number;
  };
  industrial: {
    low: number;
    medium: number;
    high: number;
  };
  office: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface ZoneStats {
  totalZoned: number;
  byType: Record<ZoneType, number>;
  byDensity: Record<ZoneCell['density'], number>;
  averageLandValue: number;
  averageHappiness: number;
  averagePollution: number;
  developmentLevel: number;
  servicesCoverage: Record<keyof ZoneCell['services'], number>;
}
