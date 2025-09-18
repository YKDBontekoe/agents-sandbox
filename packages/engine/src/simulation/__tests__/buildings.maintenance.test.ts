import { describe, expect, it } from 'vitest';
import type { SimResources } from '../../index';
import {
  calculateDeterioration,
  calculateMaintenanceCost,
  createSimulatedBuilding,
  getBuildingsNeedingMaintenance,
  performMaintenance,
  type SimulatedBuilding
} from '../buildings';

const ampleResources: SimResources = {
  grain: 200,
  coin: 200,
  mana: 200,
  favor: 50,
  workers: 50,
  wood: 200,
  planks: 200,
  defense: 0,
};

describe('building maintenance calculations', () => {
  const baseFarm: SimulatedBuilding = {
    id: 'farm-1',
    typeId: 'farm',
    x: 0,
    y: 0,
    level: 1,
    workers: 3,
    condition: 'fair',
    lastMaintenance: 0,
    maintenanceDebt: 0.3,
    utilityEfficiency: 1,
    traits: {}
  };

  it('applies condition and debt multipliers to maintenance cost', () => {
    const cost = calculateMaintenanceCost(baseFarm);
    expect(cost).toEqual({ coin: 9, planks: 2 });
  });

  it('deteriorates buildings when maintenance is overdue', () => {
    const deteriorated = calculateDeterioration(
      { ...baseFarm, condition: 'good', lastMaintenance: 0 },
      21
    );
    expect(deteriorated).toBe('poor');
  });

  it('performs maintenance when resources are available', () => {
    const building: SimulatedBuilding = {
      ...baseFarm,
      condition: 'fair',
      lastMaintenance: 2,
      maintenanceDebt: 0.5
    };

    const result = performMaintenance(building, 6, ampleResources);
    expect(result.success).toBe(true);
    expect(result.newCondition).toBe('good');
    expect(result.cost).toEqual({ coin: 10, planks: 2 });
    expect(building.lastMaintenance).toBe(6);
    expect(building.maintenanceDebt).toBeCloseTo(0.3, 5);
  });

  it('identifies buildings due for maintenance', () => {
    const fresh = createSimulatedBuilding(
      { id: 'farm-2', typeId: 'farm', x: 0, y: 0, level: 1, workers: 0 },
      2
    );
    const overdue: SimulatedBuilding = { ...baseFarm, lastMaintenance: 0 };

    const needingMaintenance = getBuildingsNeedingMaintenance([fresh, overdue], 3);
    expect(needingMaintenance).toEqual([overdue]);
  });
});
