import { describe, expect, it } from 'vitest';
import { processTick, type GameState } from '../../index';
import { SIM_BUILDINGS } from '../buildingCatalog';
import { generateSkillTree } from '../../skills/generate';

type SkillSearchResult = {
  seed: number;
  sawmillBoost: { id: string };
  upkeepReducer: { id: string };
  inputReducer: { id: string };
};

const INPUT_REDUCER_IDS = new Set(['peace_treaty', 'unity_bond']);

function findSkillCombination(): SkillSearchResult {
  for (let seed = 1; seed < 2000; seed++) {
    const tree = generateSkillTree(seed);
    const sawmillBoost = tree.nodes.find(node =>
      node.effects.some(effect =>
        (effect.kind === 'building_multiplier' && effect.typeId === 'sawmill') ||
        (effect.kind === 'resource_multiplier' && effect.resource === 'planks'),
      ),
    );
    const upkeepReducer = tree.nodes.find(node =>
      node.effects.some(effect => effect.kind === 'upkeep_delta' && effect.grainPerWorkerDelta < 0),
    );
    const inputReducer = tree.nodes.find(node => INPUT_REDUCER_IDS.has(node.specialAbility?.id ?? ''));
    if (sawmillBoost && upkeepReducer && inputReducer) {
      return {
        seed,
        sawmillBoost: { id: sawmillBoost.id },
        upkeepReducer: { id: upkeepReducer.id },
        inputReducer: { id: inputReducer.id },
      };
    }
  }
  throw new Error('Unable to locate a skill combination with sawmill boost, upkeep reducer, and input reducer');
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe('skill modifiers integration', () => {
  it('applies skill multipliers to outputs, inputs, and worker upkeep', () => {
    const { seed, sawmillBoost, upkeepReducer, inputReducer } = findSkillCombination();

    const baseState: GameState = {
      id: 'skill-test',
      cycle: 0,
      resources: {
        grain: 120,
        coin: 60,
        mana: 30,
        favor: 15,
        workers: 50,
        wood: 30,
        planks: 0,
        defense: 0,
        unrest: 0,
        threat: 0,
      },
      workers: 50,
      buildings: [
        {
          id: 'sawmill-1',
          typeId: 'sawmill',
          workers: 4,
          level: 1,
          recipe: 'fine',
        },
      ],
      routes: [],
      skills: [],
      skill_tree_seed: seed,
    };

    const skilledState: GameState = {
      ...cloneState(baseState),
      skills: [sawmillBoost.id, upkeepReducer.id, inputReducer.id],
    };

    const baseTick = processTick(cloneState(baseState), [], SIM_BUILDINGS);
    const skilledTick = processTick(cloneState(skilledState), [], SIM_BUILDINGS);

    const baseAfter = baseTick.state.resources;
    const skilledAfter = skilledTick.state.resources;

    expect(skilledAfter.planks).toBeGreaterThan(baseAfter.planks);

    const baseWoodConsumed = baseState.resources.wood - (baseAfter.wood ?? 0);
    const skilledWoodConsumed = baseState.resources.wood - (skilledAfter.wood ?? 0);
    expect(skilledWoodConsumed).toBeLessThan(baseWoodConsumed);

    expect(skilledAfter.grain).toBeGreaterThan(baseAfter.grain);
  });
});
