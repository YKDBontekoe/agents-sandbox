import { describe, expect, it } from 'vitest';
import { MetricsService } from '../metricsService';
import type { CityBuilding, CityCitizen, CityMetrics } from '../types';

describe('MetricsService', () => {
  it('calculates balanced budgets and derived metrics', () => {
    const serviceStats = {
      police: { coverage: 0.5, satisfaction: 0, efficiency: 0, cost: 40 },
      healthcare: { coverage: 0.6, satisfaction: 0, efficiency: 0, cost: 50 },
      education: { coverage: 0.8, satisfaction: 0, efficiency: 0, cost: 30 },
      parks: { coverage: 0.2, satisfaction: 0, efficiency: 0, cost: 20 },
      power: { coverage: 0.9, satisfaction: 0, efficiency: 0, cost: 10 },
      water: { coverage: 0.7, satisfaction: 0, efficiency: 0, cost: 10 },
      fire: { coverage: 0.4, satisfaction: 0, efficiency: 0, cost: 5 },
      waste: { coverage: 0.4, satisfaction: 0, efficiency: 0, cost: 5 }
    };

    const cityServices = {
      getServiceStats: (type: keyof typeof serviceStats) => serviceStats[type],
      getAllServiceStats: () => serviceStats
    };

    const publicTransport = {
      getSystemStats: () => ({ revenue: 100, operatingCost: 40, averageWaitTime: 5 })
    };

    const roadNetwork = {
      getAllRoads: () => [
        { start: { x: 0, y: 0 }, end: { x: 3, y: 4 } }
      ]
    };

    const metricsService = new MetricsService(
      cityServices as any,
      publicTransport as any,
      roadNetwork as any
    );

    const citizens: CityCitizen[] = [
      { id: 'c1', satisfaction: 80, workId: 'job1' },
      { id: 'c2', satisfaction: 60, workId: 'job2' }
    ];

    const buildings: CityBuilding[] = [
      { id: 'b1', type: 'residential', population: 3, x: 0, y: 0 },
      { id: 'b2', type: 'commercial', efficiency: 10, x: 1, y: 1 },
      { id: 'b3', type: 'industrial', efficiency: 10, x: 2, y: 2 }
    ];

    const currentMetrics: CityMetrics = {
      population: 0,
      happiness: 0,
      traffic: 0,
      pollution: 0,
      crime: 0,
      education: 0,
      healthcare: 0,
      employment: 0,
      budget: 1000,
      income: 0,
      expenses: 0
    };

    const result = metricsService.calculate({ citizens, buildings, currentMetrics });

    expect(result.metrics.population).toBe(2);
    expect(result.metrics.happiness).toBe(70);
    expect(result.metrics.traffic).toBe(50);
    expect(result.metrics.pollution).toBeCloseTo(5.5, 5);
    expect(result.metrics.crime).toBe(30);
    expect(result.metrics.education).toBe(80);
    expect(result.metrics.healthcare).toBe(60);
    expect(result.metrics.employment).toBe(100);
    expect(result.metrics.income).toBe(260);
    expect(result.metrics.expenses).toBe(260);
    expect(result.budgetDelta).toBeCloseTo(0, 5);
  });
});
