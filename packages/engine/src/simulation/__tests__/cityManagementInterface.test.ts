import { describe, expect, it } from 'vitest';
import { createGameTime } from '../../types/gameTime';
import { CityManagementInterface } from '../cityManagementInterface';
import { createZoneAction } from '../cityManagement/cityActions';

const baseConfig = {
  gridWidth: 20,
  gridHeight: 20,
  initialBudget: 10000,
  difficulty: 'normal' as const
};

describe('CityManagementInterface integration', () => {
  it('applies income and expenses when updating the simulation', async () => {
    const management = new CityManagementInterface(baseConfig);
    await management.initialize();
    management.startSimulation();

    expect(management.zoneArea(0, 0, 0, 0)).toBe(true);
    expect(management.buildService(2, 2)).toBe(true);

    management.update(1, createGameTime(0));

    const stats = management.getStats();
    expect(stats.population).toBe(10);
    expect(stats.income).toBe(50);
    expect(stats.expenses).toBe(5110);
    expect(stats.budget).toBe(4940);
  });

  it('deducts budget and records expenses when executing an action immediately', async () => {
    const management = new CityManagementInterface({ ...baseConfig, initialBudget: 1000 });
    await management.initialize();

    const action = createZoneAction({
      startX: 5,
      startY: 5,
      endX: 5,
      endY: 5,
      zoneType: 'residential'
    });

    await expect(management.executeAction(action)).resolves.toBe(true);

    const stats = management.getStats();
    expect(stats.budget).toBe(900);
    expect(stats.expenses).toBe(action.cost);
    expect(management.getZoningSystem().getZonesByType('residential').length).toBeGreaterThan(0);
  });
});
