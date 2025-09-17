import type { SimulatedBuilding } from '../buildings/catalog';
import type { ZoneCell, ZoneDemand } from './types';
import { inferZoneTypeFromBuilding } from './zoneRules';

const DEFAULT_SERVICE_RANGE = 10;
const DEFAULT_POLLUTION_RANGE = 15;

export interface ZoneUpdateContext {
  buildings: SimulatedBuilding[];
  globalDemand: ZoneDemand;
  serviceRange?: number;
  pollutionRange?: number;
  timestamp?: number;
}

export interface ZoneUpdateResult {
  services: ZoneCell['services'];
  pollution: number;
  happiness: number;
  demand: number;
  level: number;
}

export function calculateZoneServices(
  zone: ZoneCell,
  buildings: SimulatedBuilding[],
  range: number = DEFAULT_SERVICE_RANGE
): ZoneCell['services'] {
  const services: ZoneCell['services'] = {
    power: false,
    water: false,
    sewage: false,
    garbage: false,
    fire: false,
    police: false,
    healthcare: false,
    education: false
  };

  for (const building of buildings) {
    if (!isWithinRange(zone, building, range)) continue;

    const { typeId } = building;
    if (typeId.includes('power')) services.power = true;
    if (typeId.includes('water')) services.water = true;
    if (typeId.includes('sewage')) services.sewage = true;
    if (typeId.includes('garbage')) services.garbage = true;
    if (typeId.includes('fire')) services.fire = true;
    if (typeId.includes('police')) services.police = true;
    if (typeId.includes('hospital') || typeId.includes('clinic')) services.healthcare = true;
    if (typeId.includes('school') || typeId.includes('university')) services.education = true;
  }

  return services;
}

export function calculateZonePollution(
  zone: ZoneCell,
  buildings: SimulatedBuilding[],
  range: number = DEFAULT_POLLUTION_RANGE
): number {
  let pollution = 0;

  for (const building of buildings) {
    if (!isWithinRange(zone, building, range)) continue;

    if (inferZoneTypeFromBuilding(building.typeId) === 'industrial') {
      const distance = distanceBetween(zone, building);
      const pollutionAmount = Math.max(0, 50 - distance * 3);
      pollution += pollutionAmount;
    }
  }

  return Math.min(100, pollution);
}

export function calculateZoneHappiness(
  zone: ZoneCell,
  services: ZoneCell['services'],
  pollution: number
): number {
  let happiness = 50;
  const serviceCount = Object.values(services).filter(Boolean).length;
  happiness += serviceCount * 5;
  happiness -= pollution * 0.3;
  happiness += (zone.landValue / 1000) * 20;

  if (zone.type === 'residential') {
    happiness += services.education ? 10 : -5;
    happiness += services.healthcare ? 8 : -3;
  } else if (zone.type === 'commercial') {
    happiness += services.police ? 5 : 0;
  } else if (zone.type === 'industrial') {
    happiness -= 10;
  }

  return Math.max(0, Math.min(100, happiness));
}

export function calculateZoneDemand(
  zone: ZoneCell,
  globalDemand: ZoneDemand,
  happiness: number,
  pollution: number,
  services: ZoneCell['services']
): number {
  const demand = globalDemand[zone.type as keyof ZoneDemand];
  if (!demand) {
    return 0;
  }

  let value = demand[zone.density] || 0;
  value += (happiness - 50) * 0.5;
  value -= pollution * 0.3;
  value += (zone.landValue / 1000) * 20;

  const required = getRequiredServices(zone.type, zone.density);
  const met = required.filter(service => services[service]).length;
  const ratio = required.length > 0 ? met / required.length : 1;
  value *= ratio;

  return Math.max(-100, Math.min(100, value));
}

export function calculateZoneLevel(
  zone: ZoneCell,
  buildings: SimulatedBuilding[],
  derived: { happiness: number; demand: number; pollution: number; services: ZoneCell['services'] }
): number {
  const buildingsInZone = buildings.filter(b => Math.floor(b.x) === zone.x && Math.floor(b.y) === zone.y);

  if (buildingsInZone.length === 0) {
    return 1;
  }

  const avgBuildingLevel = buildingsInZone.reduce((sum, b) => sum + (b.level || 1), 0) / buildingsInZone.length;
  let targetLevel = Math.floor(avgBuildingLevel);

  if (derived.happiness > 80) targetLevel += 1;
  if (derived.demand > 50) targetLevel += 1;
  if (derived.pollution > 50) targetLevel -= 1;

  const serviceCount = Object.values(derived.services).filter(Boolean).length;
  if (serviceCount >= 6) targetLevel += 1;

  return Math.max(1, Math.min(5, targetLevel));
}

export function calculateZoneUpdate(zone: ZoneCell, context: ZoneUpdateContext): ZoneUpdateResult {
  const services = calculateZoneServices(zone, context.buildings, context.serviceRange);
  const pollution = calculateZonePollution(zone, context.buildings, context.pollutionRange);
  const happiness = calculateZoneHappiness(zone, services, pollution);
  const demand = calculateZoneDemand(zone, context.globalDemand, happiness, pollution, services);
  const level = calculateZoneLevel(zone, context.buildings, { happiness, demand, pollution, services });

  return { services, pollution, happiness, demand, level };
}

export function updateZone(zone: ZoneCell, context: ZoneUpdateContext): ZoneCell {
  const result = calculateZoneUpdate(zone, context);
  return {
    ...zone,
    ...result,
    lastUpdate: context.timestamp ?? Date.now()
  };
}

function getRequiredServices(zoneType: ZoneCell['type'], density: ZoneCell['density']): Array<keyof ZoneCell['services']> {
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

function isWithinRange(zone: ZoneCell, building: SimulatedBuilding, range: number): boolean {
  return distanceBetween(zone, building) <= range;
}

function distanceBetween(zone: ZoneCell, building: SimulatedBuilding): number {
  return Math.sqrt(Math.pow(building.x - zone.x, 2) + Math.pow(building.y - zone.y, 2));
}
