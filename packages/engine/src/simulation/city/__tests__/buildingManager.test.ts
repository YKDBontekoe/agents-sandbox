import { describe, expect, it } from 'vitest';
import { BuildingManager } from '../buildingManager';
import type { CityBuilding } from '../types';

describe('BuildingManager', () => {
  it('schedules upgrades when zoning changes and budget allows', () => {
    const services = {
      getAllServiceStats: () => ({
        police: { coverage: 0.8, satisfaction: 0, efficiency: 0, cost: 0 },
        healthcare: { coverage: 0.9, satisfaction: 0, efficiency: 0, cost: 0 },
        education: { coverage: 0.7, satisfaction: 0, efficiency: 0, cost: 0 },
        power: { coverage: 1, satisfaction: 0, efficiency: 0, cost: 0 },
        water: { coverage: 1, satisfaction: 0, efficiency: 0, cost: 0 },
        fire: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 },
        waste: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 },
        parks: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 }
      })
    };
    const zoning = { getZoneAt: () => ({ type: 'commercial' }) };

    const manager = new BuildingManager(services as any, zoning as any);
    const building: CityBuilding = {
      id: 'building-1',
      type: 'residential',
      x: 0,
      y: 0,
      baseEfficiency: 80,
      zoneType: 'residential'
    };

    const result = manager.evaluateBuildings([building], { traffic: 0, crime: 5 }, 1000, 2000);

    expect(result.updates).toHaveLength(1);
    const changes = result.updates[0].changes;
    expect(changes.zoneType).toBe('commercial');
    expect(changes.needsUpgrade).toBe(true);
    expect(changes.upgrading).toBe(true);
    expect(changes.upgradeTarget).toBe('commercial');
    expect(changes.upgradeTime).toBe(31000);
    expect(result.budgetDelta).toBe(-1500);
  });

  it('marks buildings for upgrade even when budget is insufficient', () => {
    const services = {
      getAllServiceStats: () => ({
        police: { coverage: 0.8, satisfaction: 0, efficiency: 0, cost: 0 },
        healthcare: { coverage: 0.9, satisfaction: 0, efficiency: 0, cost: 0 },
        education: { coverage: 0.7, satisfaction: 0, efficiency: 0, cost: 0 },
        power: { coverage: 1, satisfaction: 0, efficiency: 0, cost: 0 },
        water: { coverage: 1, satisfaction: 0, efficiency: 0, cost: 0 },
        fire: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 },
        waste: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 },
        parks: { coverage: 0.3, satisfaction: 0, efficiency: 0, cost: 0 }
      })
    };
    const zoning = { getZoneAt: () => ({ type: 'industrial' }) };

    const manager = new BuildingManager(services as any, zoning as any);
    const building: CityBuilding = {
      id: 'building-2',
      type: 'residential',
      x: 0,
      y: 0,
      baseEfficiency: 80,
      zoneType: 'residential'
    };

    const result = manager.evaluateBuildings([building], { traffic: 0, crime: 5 }, 1000, 500);

    expect(result.updates).toHaveLength(1);
    const changes = result.updates[0].changes;
    expect(changes.zoneType).toBe('industrial');
    expect(changes.needsUpgrade).toBe(true);
    expect(changes.upgrading).toBeUndefined();
    expect(result.budgetDelta).toBe(0);
  });
});
