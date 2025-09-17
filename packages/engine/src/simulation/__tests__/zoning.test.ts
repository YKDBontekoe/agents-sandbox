import { describe, expect, it } from 'vitest';

import type { SimulatedBuilding } from '../buildings';
import { initializeDemand } from '../zoning/demand';
import type { ZoneCell } from '../zoning/types';
import { areZonesCompatible } from '../zoning/zoneRules';
import { calculateZoneServices, calculateZoneUpdate } from '../zoning/zoneUpdates';

function createZone(overrides: Partial<ZoneCell> = {}): ZoneCell {
  return {
    x: 5,
    y: 5,
    type: 'residential',
    density: 'low',
    level: 1,
    demand: 0,
    pollution: 0,
    landValue: 200,
    services: {
      power: false,
      water: false,
      sewage: false,
      garbage: false,
      fire: false,
      police: false,
      healthcare: false,
      education: false
    },
    happiness: 50,
    lastUpdate: 0,
    ...overrides
  };
}

function createBuilding(typeId: string, x: number, y: number, level = 1): SimulatedBuilding {
  return {
    id: `${typeId}-${x}-${y}`,
    typeId,
    x,
    y,
    level,
    workers: 10,
    condition: 'good',
    lastMaintenance: 0,
    maintenanceDebt: 0,
    utilityEfficiency: 1
  };
}

describe('zoneRules', () => {
  it('rejects overlapping incompatible zones', () => {
    expect(areZonesCompatible('residential', 'industrial')).toBe(false);
  });

  it('allows mixed use with any zone type', () => {
    expect(areZonesCompatible('mixed', 'industrial')).toBe(true);
    expect(areZonesCompatible('commercial', 'mixed')).toBe(true);
  });
});

describe('zoneUpdates', () => {
  it('calculates service coverage within range', () => {
    const zone = createZone();
    const buildings = [
      createBuilding('power_station', 6, 5),
      createBuilding('water_tower', 4, 5),
      createBuilding('sewage_plant', 5, 6),
      createBuilding('garbage_facility', 5, 4),
      createBuilding('fire_station', 7, 5),
      createBuilding('police_station', 5, 7),
      createBuilding('hospital', 3, 5),
      createBuilding('school', 5, 3)
    ];

    const services = calculateZoneServices(zone, buildings);

    expect(services).toEqual({
      power: true,
      water: true,
      sewage: true,
      garbage: true,
      fire: true,
      police: true,
      healthcare: true,
      education: true
    });
  });

  it('reduces demand when required services are unavailable', () => {
    const demand = initializeDemand();
    const denseZone = createZone({ density: 'high' });

    const withoutServices = calculateZoneUpdate(denseZone, {
      buildings: [],
      globalDemand: demand,
      timestamp: 0
    });

    const supportiveBuildings = [
      createBuilding('power_station', 5, 6),
      createBuilding('water_tower', 5, 4),
      createBuilding('sewage_plant', 6, 5),
      createBuilding('garbage_facility', 4, 5),
      createBuilding('fire_station', 7, 5),
      createBuilding('police_station', 5, 7),
      createBuilding('hospital', 3, 5),
      createBuilding('school', 5, 3),
      createBuilding('apartment', 5, 5, 3)
    ];

    const withServices = calculateZoneUpdate(denseZone, {
      buildings: supportiveBuildings,
      globalDemand: demand,
      timestamp: 0
    });

    expect(withServices.demand).toBeGreaterThan(withoutServices.demand);
    expect(withServices.services.power).toBe(true);
    expect(withServices.services.education).toBe(true);
    expect(withServices.pollution).toBeGreaterThanOrEqual(0);
  });
});
