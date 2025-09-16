import { describe, expect, it, vi } from 'vitest';
import { CitizenManager } from '../citizenManager';
import type { CityCitizen } from '../types';

describe('CitizenManager', () => {
  it('matches citizens to the nearest available job', () => {
    const pathfinding = { findPath: vi.fn().mockReturnValue({ success: false }) };
    const publicTransport = {
      findRoute: vi.fn().mockReturnValue(null),
      addPassenger: vi.fn(),
      getSystemStats: vi.fn().mockReturnValue({ averageWaitTime: 0, revenue: 0, operatingCost: 0 })
    };
    const traffic = { spawnVehicle: vi.fn() };
    const zoning = {
      getZonesByType: vi.fn().mockImplementation((type: string) => {
        if (type === 'commercial') {
          return [{ x: 5, y: 5 }];
        }
        if (type === 'industrial') {
          return [{ x: 2, y: 2 }];
        }
        return [];
      })
    };
    const services = {
      getAllServiceStats: vi.fn().mockReturnValue({
        police: { satisfaction: 0, coverage: 0, efficiency: 0, cost: 0 },
        healthcare: { satisfaction: 0, coverage: 0, efficiency: 0, cost: 0 },
        education: { satisfaction: 0, coverage: 0, efficiency: 0, cost: 0 },
        parks: { satisfaction: 0, coverage: 0, efficiency: 0, cost: 0 }
      })
    };

    const manager = new CitizenManager(
      pathfinding as any,
      publicTransport as any,
      traffic as any,
      zoning as any,
      services as any
    );

    const citizen: CityCitizen = {
      id: 'citizen-1',
      needsWork: true,
      homePosition: { x: 0, y: 0 }
    };

    const updates = manager.evaluateCitizens([citizen], { traffic: 0, pollution: 0, crime: 0 });

    expect(updates).toHaveLength(1);
    expect(updates[0].changes.workId).toBe('2_2');
    expect(updates[0].changes.needsWork).toBe(false);
    expect(updates[0].changes.workPosition).toEqual({ x: 2, y: 2 });
  });
});
