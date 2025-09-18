import { describe, expect, it } from 'vitest';
import type { SimResources } from '../../index';
import {
  calculateBuildingOutput,
  calculateTotalUtilityConsumption,
  calculateUtilityEfficiency,
  type SimulatedBuilding
} from '../buildings';

const baseResources = (): SimResources => ({
  grain: 100,
  coin: 100,
  mana: 100,
  favor: 20,
  workers: 40,
  wood: 80,
  planks: 40,
  defense: 0,
});

describe('building production adjustments', () => {
  it('uses minimum efficiency floor when utilities fall short', () => {
    const workshop: SimulatedBuilding = {
      id: 'auto-1',
      typeId: 'automation_workshop',
      x: 0,
      y: 0,
      level: 1,
      workers: 0,
      condition: 'excellent',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1,
      traits: {}
    };

    const resources: SimResources = { ...baseResources(), mana: 1 };
    const efficiency = calculateUtilityEfficiency(workshop, resources);
    expect(efficiency).toBeCloseTo(0.7, 5);
  });

  it('reduces output based on condition and utility efficiency', () => {
    const tradePost: SimulatedBuilding = {
      id: 'trade-1',
      typeId: 'trade_post',
      x: 4,
      y: 2,
      level: 1,
      workers: 0,
      condition: 'poor',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 0.6,
      traits: {}
    };

    const output = calculateBuildingOutput(tradePost, { coin: 8 });
    expect(output.coin).toBe(1);
  });

  it('totals utility consumption across buildings', () => {
    const farm: SimulatedBuilding = {
      id: 'farm-1',
      typeId: 'farm',
      x: 0,
      y: 0,
      level: 1,
      workers: 4,
      condition: 'good',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1,
      traits: {}
    };
    const workshop: SimulatedBuilding = {
      id: 'auto-1',
      typeId: 'automation_workshop',
      x: 1,
      y: 1,
      level: 1,
      workers: 0,
      condition: 'excellent',
      lastMaintenance: 0,
      maintenanceDebt: 0,
      utilityEfficiency: 1,
      traits: {}
    };

    const total = calculateTotalUtilityConsumption([farm, workshop]);
    expect(total).toEqual({ coin: 1, grain: 2, mana: 2 });
  });
});
