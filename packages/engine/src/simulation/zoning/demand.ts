import type { ZoneCell, ZoneDemand, ZoneType } from './types';

export interface GlobalFactors {
  population: number;
  employment: number;
  economy: number;
  pollution: number;
  happiness: number;
}

export function initializeDemand(): ZoneDemand {
  return {
    residential: { low: 50, medium: 30, high: 10 },
    commercial: { low: 40, medium: 25, high: 15 },
    industrial: { low: 35, medium: 20, high: 10 },
    office: { low: 20, medium: 15, high: 5 }
  };
}

export function calculateInitialDemand(zoneType: ZoneType, density: ZoneCell['density']): number {
  const baseDemand = {
    residential: { low: 60, medium: 40, high: 20 },
    commercial: { low: 50, medium: 35, high: 25 },
    industrial: { low: 45, medium: 30, high: 15 },
    office: { low: 30, medium: 20, high: 10 },
    mixed: { low: 40, medium: 30, high: 20 },
    special: { low: 20, medium: 15, high: 10 },
    unzoned: { low: 0, medium: 0, high: 0 }
  } as Record<ZoneType, Record<ZoneCell['density'], number>>;

  return baseDemand[zoneType][density] || 0;
}

export function updateDemand(demand: ZoneDemand, factors: GlobalFactors): ZoneDemand {
  const populationFactor = Math.min(2, factors.population / 1000);
  const economyFactor = factors.economy / 100;
  const happinessFactor = factors.happiness / 100;

  const updated: ZoneDemand = {
    residential: {
      low: Math.max(0, 50 + economyFactor * 30 + happinessFactor * 20),
      medium: Math.max(0, 30 + economyFactor * 20 + happinessFactor * 15),
      high: Math.max(0, 10 + economyFactor * 15 + happinessFactor * 10)
    },
    commercial: {
      low: Math.max(0, 40 + populationFactor * 20),
      medium: Math.max(0, 25 + populationFactor * 15),
      high: Math.max(0, 15 + populationFactor * 10)
    },
    industrial: {
      low: Math.max(0, 35 + populationFactor * 15 - (happinessFactor - 0.5) * 20),
      medium: Math.max(0, 20 + populationFactor * 10 - (happinessFactor - 0.5) * 15),
      high: Math.max(0, 10 + populationFactor * 5 - (happinessFactor - 0.5) * 10)
    },
    office: {
      low: Math.max(0, 20 + economyFactor * 25 + populationFactor * 10),
      medium: Math.max(0, 15 + economyFactor * 20 + populationFactor * 8),
      high: Math.max(0, 5 + economyFactor * 15 + populationFactor * 5)
    }
  };

  return updated;
}

export function updateZoneDemand(zone: ZoneCell, globalDemand: ZoneDemand): void {
  const demand = globalDemand[zone.type as keyof ZoneDemand];
  if (!demand) {
    zone.demand = 0;
    return;
  }

  let value = demand[zone.density] || 0;
  value += (zone.happiness - 50) * 0.5;
  value -= zone.pollution * 0.3;
  value += (zone.landValue / 1000) * 20;

  const required = getRequiredServices(zone.type, zone.density);
  const met = required.filter(service => zone.services[service]).length;
  const ratio = required.length > 0 ? met / required.length : 1;
  value *= ratio;

  zone.demand = Math.max(-100, Math.min(100, value));
}

function getRequiredServices(zoneType: ZoneType, density: ZoneCell['density']): Array<keyof ZoneCell['services']> {
  const base: Array<keyof ZoneCell['services']> = ['power', 'water'];

  if (density === 'medium' || density === 'high') {
    base.push('sewage', 'garbage');
  }

  if (zoneType === 'residential') {
    base.push('fire', 'police');
    if (density === 'high') {
      base.push('healthcare', 'education');
    }
  } else if (zoneType === 'commercial') {
    base.push('police');
  } else if (zoneType === 'industrial') {
    base.push('fire');
  }

  return base;
}
