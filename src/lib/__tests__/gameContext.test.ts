import { describe, expect, it } from 'vitest'
import { buildGameContext } from '../gameContext'
import { generateSkillTree } from '@engine/skills/generate'
import { deriveSkillEffects } from '@engine/skills/modifiers'

describe('buildGameContext', () => {
  it('summarizes buildings, routes, terrain and skills', () => {
    const state = {
      buildings: [
        { typeId: 'farm', traits: { waterAdj: 1 } },
        { typeId: 'farm' },
        { typeId: 'shrine', traits: { mountainAdj: 2 } },
        { typeId: 'lumber_camp', traits: { forestAdj: 1 } },
        { typeId: 'storehouse' },
      ],
      routes: [{}, {}, {}],
      skills: [],
    }
    const ctx = buildGameContext(state)
    expect(ctx).toEqual({
      buildings_by_type: { farm: 2, shrine: 1, lumber_camp: 1, storehouse: 1 },
      routes_count: 3,
      storehouse_present: true,
      terrain_summary: { farmsNearWater: 1, shrinesNearMountains: 1, campsNearForest: 1 },
      skill_modifiers: {
        resource_multipliers: {},
        building_multipliers: {},
        upkeep_grain_per_worker_delta: 0,
        global_building_output_multiplier: 1,
        global_resource_output_multiplier: 1,
        route_coin_output_multiplier: 1,
        patrol_coin_upkeep_multiplier: 1,
        building_input_multiplier: 1,
      },
    })
  })

  it('computes skill modifiers from unlocked skills', () => {
    const seed = 99
    const tree = generateSkillTree(seed)
    const unlocked = tree.nodes.slice(0, 2)
    const state = { skills: unlocked.map(n => n.id), skill_tree_seed: seed }
    const ctx = buildGameContext(state)
    const expected = deriveSkillEffects(unlocked.map(n => n.id), { tree })
    expect(ctx.skill_modifiers).toEqual({
      resource_multipliers: expected.resMul,
      building_multipliers: expected.bldMul,
      upkeep_grain_per_worker_delta: expected.upkeepDelta,
      global_building_output_multiplier: expected.globalBuildingMultiplier,
      global_resource_output_multiplier: expected.globalResourceMultiplier,
      route_coin_output_multiplier: expected.routeCoinMultiplier,
      patrol_coin_upkeep_multiplier: expected.patrolCoinUpkeepMultiplier,
      building_input_multiplier: expected.buildingInputMultiplier,
    })
  })
})
