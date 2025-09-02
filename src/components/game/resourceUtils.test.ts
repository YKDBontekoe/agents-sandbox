import { describe, it, expect } from 'vitest';
import {
  getResourceIcon,
  getResourceColor,
  applyProduction,
  canAfford,
  applyCost,
  type SimResources,
  type SimBuildingDef
} from './resourceUtils';
import { ICONS, COLORS, type ResourceType } from '../../lib/resources';

describe('resourceUtils', () => {
  const types = Object.keys(ICONS) as ResourceType[];

  types.forEach((type) => {
    it(`returns correct icon for ${type}`, () => {
      expect(getResourceIcon(type)).toBe(ICONS[type]);
    });

    it(`returns correct color for ${type}`, () => {
      expect(getResourceColor(type)).toBe(COLORS[type]);
    });
  });
});

describe('applyProduction', () => {
  const catalog: Record<string, SimBuildingDef> = {
    mill: { inputs: { grain: 2 }, outputs: { coin: 1 } }
  };

  it('produces outputs when inputs are available', () => {
    const res: SimResources = { grain: 5, coin: 0, mana: 0, favor: 0, population: 0 };
    const { updated, shortages } = applyProduction(res, [{ typeId: 'mill' }], catalog);
    expect(updated.grain).toBe(3);
    expect(updated.coin).toBe(1);
    expect(shortages).toEqual({});
  });

  it('records shortages when inputs are missing', () => {
    const res: SimResources = { grain: 1, coin: 0, mana: 0, favor: 0, population: 0 };
    const { updated, shortages } = applyProduction(res, [{ typeId: 'mill' }], catalog);
    expect(updated.grain).toBe(1);
    expect(updated.coin).toBe(0);
    expect(shortages).toEqual({ grain: 1 });
  });
});

describe('canAfford and applyCost', () => {
  const base: SimResources = { grain: 5, coin: 5, mana: 5, favor: 5, population: 0 };

  it('determines affordability correctly', () => {
    expect(canAfford({ grain: 3, coin: 2 }, base)).toBe(true);
    expect(canAfford({ mana: 6 }, base)).toBe(false);
  });

  it('applies costs and clamps at zero', () => {
    const next = applyCost(base, { grain: 3, coin: 10 });
    expect(next.grain).toBe(2);
    expect(next.coin).toBe(0);
  });
});
