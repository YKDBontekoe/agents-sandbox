import { describe, expect, it } from 'vitest';
import {
  produceBuildings,
  processTick,
  SIM_BUILDINGS,
  type GameState,
} from '../src';

describe('wonder passive effects', () => {
  it('applies Astral Bastion production and passives', () => {
    const state: GameState = {
      id: 'wonder-test',
      cycle: 0,
      resources: {
        grain: 50,
        coin: 40,
        mana: 60,
        favor: 10,
        unrest: 10,
        threat: 10,
        wood: 0,
        planks: 0,
        defense: 0,
      },
      workers: 0,
      buildings: [{ id: 'astral', typeId: 'astral_bastion', level: 1, workers: 0 }],
      routes: [],
    };

    const { resources, passiveEffects } = produceBuildings(state, SIM_BUILDINGS);

    expect(resources.mana).toBe(63);
    expect(resources.defense).toBe(15);
    expect(resources.unrest).toBe(9);
    expect(resources.threat).toBe(8);
    expect(passiveEffects.tickAdjustments).toMatchObject({ threat: -2, unrest: -1 });
    expect(passiveEffects.resMul.defense).toBeCloseTo(1.2, 5);
    expect(passiveEffects.globalResourceMultiplier).toBeCloseTo(1.05, 5);
  });

  it('boosts mana, favor, and defense across a full tick when wonders stand', () => {
    const baseState: GameState = {
      id: 'base-city',
      cycle: 10,
      resources: {
        grain: 120,
        coin: 150,
        mana: 80,
        favor: 25,
        unrest: 18,
        threat: 20,
        wood: 40,
        planks: 20,
        defense: 0,
      },
      workers: 6,
      buildings: [
        { id: 'council', typeId: 'council_hall', level: 1, workers: 0 },
        { id: 'shrine', typeId: 'shrine', level: 1, workers: 0 },
      ],
      routes: [],
      quests_completed: 3,
    };

    const wonderState: GameState = {
      ...baseState,
      id: 'wonder-city',
      buildings: [
        ...baseState.buildings!,
        { id: 'astral', typeId: 'astral_bastion', level: 1, workers: 0 },
        { id: 'archive', typeId: 'eternal_archive', level: 1, workers: 0 },
      ],
    };

    const baseResult = processTick(baseState, [], SIM_BUILDINGS);
    const wonderResult = processTick(wonderState, [], SIM_BUILDINGS);

    const baseResources = baseResult.state.resources;
    const wonderResources = wonderResult.state.resources;

    expect(wonderResources.mana).toBeGreaterThan(baseResources.mana);
    expect(wonderResources.favor).toBeGreaterThanOrEqual(baseResources.favor);
    expect(wonderResources.defense).toBeGreaterThan(baseResources.defense);
    expect(wonderResources.threat).toBeLessThanOrEqual(baseResources.threat);
    expect(wonderResources.unrest).toBeLessThanOrEqual(baseResources.unrest);
  });
});

