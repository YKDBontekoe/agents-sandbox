import { accumulateEffects, generateSkillTree } from '../components/game/skills/procgen'
import type { GameState } from '@/domain/repositories/game-state-repository'

interface RawBuilding {
  typeId?: string
  traits?: Record<string, unknown>
}

export interface GameContext {
  buildings_by_type: Record<string, number>
  routes_count: number
  storehouse_present: boolean
  terrain_summary: {
    farmsNearWater: number
    shrinesNearMountains: number
    campsNearForest: number
  }
  skill_modifiers: {
    resource_multipliers: Record<string, number>
    building_multipliers: Record<string, number>
    upkeep_grain_per_worker_delta: number
  }
}

export function buildGameContext(state: GameState | null | undefined): GameContext {
  const buildings: RawBuilding[] = Array.isArray(state?.buildings)
    ? (state!.buildings! as RawBuilding[])
    : []
  const routes: unknown[] = Array.isArray(state?.routes) ? state!.routes! : []

  const byType: Record<string, number> = {}
  let farmsNearWater = 0
  let shrinesNearMountains = 0
  let campsNearForest = 0
  for (const b of buildings) {
    const t = String(b.typeId || '')
    byType[t] = (byType[t] ?? 0) + 1
    const tr = b.traits || {}
    if (t === 'farm' && Number((tr as Record<string, unknown>).waterAdj || 0) > 0) farmsNearWater++
    if (t === 'shrine' && Number((tr as Record<string, unknown>).mountainAdj || 0) > 0) shrinesNearMountains++
    if (t === 'lumber_camp' && Number((tr as Record<string, unknown>).forestAdj || 0) > 0) campsNearForest++
  }

  let skillModifiers: GameContext['skill_modifiers'] = {
    resource_multipliers: {},
    building_multipliers: {},
    upkeep_grain_per_worker_delta: 0,
  }
  const skills: string[] = Array.isArray(state?.skills) ? state!.skills! : []
  if (skills.length > 0) {
    try {
      const tree = generateSkillTree(state?.skill_tree_seed ?? 12345)
      const unlocked = tree.nodes.filter(n => skills.includes(n.id))
      const acc = accumulateEffects(unlocked)
      skillModifiers = {
        resource_multipliers: acc.resMul,
        building_multipliers: acc.bldMul,
        upkeep_grain_per_worker_delta: acc.upkeepDelta,
      }
    } catch {
      // ignore skill tree errors
    }
  }

  return {
    buildings_by_type: byType,
    routes_count: routes.length,
    storehouse_present: (byType['storehouse'] ?? 0) > 0,
    terrain_summary: { farmsNearWater, shrinesNearMountains, campsNearForest },
    skill_modifiers: skillModifiers,
  }
}
