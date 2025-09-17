import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import useCityManagement from '../useCityManagement';
import type {
  CityManagementInterface,
  CityManagementConfig,
  CityStats,
  GameTime,
  ManagementAction
} from '@engine';

class StubCityManagement {
  public stats: CityStats;
  public initialize = vi.fn(async () => {});
  public startSimulation = vi.fn();
  public update = vi.fn();
  public dispose = vi.fn();
  public getStats = vi.fn(() => ({ ...this.stats }));
  public executeAction = vi.fn(async (action: ManagementAction) => {
    if (this.stats.budget < action.cost) {
      return false;
    }

    this.stats = { ...this.stats, budget: this.stats.budget - action.cost };
    return true;
  });

  constructor(config: CityManagementConfig) {
    this.stats = createStats(config.initialBudget ?? 10000);
  }
}

const createStats = (budget: number): CityStats => ({
  population: 0,
  happiness: 50,
  traffic: 0,
  pollution: 0,
  crime: 0,
  education: 0,
  healthcare: 0,
  employment: 0,
  budget,
  income: 0,
  expenses: 0
});

const instances: StubCityManagement[] = [];

function renderHook<TResult>(callback: () => TResult) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result: { current: TResult } = { current: undefined as unknown as TResult };

  const HookWrapper = () => {
    result.current = callback();
    return null;
  };

  act(() => {
    root.render(<HookWrapper />);
  });

  return {
    result,
    rerender() {
      act(() => {
        root.render(<HookWrapper />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

describe('useCityManagement', () => {
  beforeEach(() => {
    instances.length = 0;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const createHook = () =>
    renderHook(() =>
      useCityManagement({
        autoUpdate: false,
        createInterface: config => {
          const instance = new StubCityManagement(config);
          instances.push(instance);
          return instance as unknown as CityManagementInterface;
        }
      })
    );

  it('deducts budget when actions succeed', async () => {
    const { result, unmount } = createHook();

    await act(async () => {
      await result.current.initialize();
    });

    const initialBudget = result.current.state.stats.budget;

    let success = false;
    await act(async () => {
      success = await result.current.executeAction({
        type: 'build_road',
        position: { x: 0, y: 0 },
        data: { endPosition: { x: 1, y: 0 }, roadType: 'residential' },
        cost: 200
      });
    });

    expect(success).toBe(true);
    expect(result.current.state.stats.budget).toBe(initialBudget - 200);

    unmount();
  });

  it('preserves budget when actions fail', async () => {
    const { result, unmount } = createHook();

    await act(async () => {
      await result.current.initialize();
    });

    const initialBudget = result.current.state.stats.budget;

    let success = true;
    await act(async () => {
      success = await result.current.executeAction({
        type: 'build_service',
        position: { x: 0, y: 0 },
        data: { serviceType: 'hospital' },
        cost: initialBudget + 1000
      });
    });

    expect(success).toBe(false);
    expect(result.current.state.stats.budget).toBe(initialBudget);

    unmount();
  });

  it('forwards delta time and game time to the engine update', async () => {
    const { result, unmount } = createHook();

    await act(async () => {
      await result.current.initialize();
    });

    const instance = instances[0];

    const gameTime: GameTime = {
      year: 1,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
      totalMinutes: 0,
      timeOfDay: 'morning',
      dayProgress: 0,
      season: 'spring'
    };

    await act(async () => {
      result.current.updateSimulation(0.5, gameTime);
    });

    expect(instance.update).toHaveBeenCalledWith(0.5, gameTime);
    expect(result.current.state.isSimulating).toBe(false);

    unmount();
  });
});
