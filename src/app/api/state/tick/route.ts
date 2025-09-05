import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { SIM_BUILDINGS } from '@/lib/buildingCatalog'

type ResKey = 'grain' | 'wood' | 'planks' | 'coin' | 'mana' | 'favor' | 'unrest' | 'threat';

// Advance one cycle: apply accepted proposals to resources with simple rules and clear applied
export async function POST() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  // Get latest state
  const state = await uow.gameStates.getLatest()
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  // Fetch accepted proposals
  const accepted = await uow.proposals.listByState(state.id, ['accepted'])

  // Apply predicted deltas
  const resources = { ...state.resources }
  for (const p of accepted ?? []) {
    const delta = p.predicted_delta || {}
    for (const key of Object.keys(delta)) {
      const value = Number(delta[key] ?? 0)
      resources[key] = Math.max(0, (Number(resources[key] ?? 0) + value))
    }
  }

  // Apply per-building production (conservative: skip building if any input is missing)
  const buildings: Array<{ typeId?: string; workers?: number } & Record<string, unknown>> = Array.isArray(state.buildings) ? state.buildings as any : []
  let workers = Number(state.workers ?? 0)
  const edicts: Record<string, number> = (state as any).edicts || {}
  // Trade tariffs: 0..100 -> route coin multiplier ~ 0.8..1.4
  const tariffValue = Math.max(0, Math.min(100, Number(edicts['tariffs'] ?? 50)))
  const routeCoinMultiplier = 0.8 + (tariffValue * 0.006) // 0.8..1.4
  const patrolsEnabled = Number(edicts['patrols'] ?? 0) === 1
  
  // Precompute routing graph to detect storehouse connections
  const routes2: Array<{ id: string; fromId: string; toId: string; length?: number }> = Array.isArray((state as any).routes) ? (state as any).routes as any : []
  const byId = new Map<string, any>((buildings as any).map((bb: any) => [String(bb.id), bb]))
  const connectedToStorehouse = new Set<string>()
  if (routes2.length > 0) {
    for (const r of routes2) {
      const a = byId.get(String(r.fromId))
      const b = byId.get(String(r.toId))
      if (!a || !b) continue
      if (String(a.typeId) === 'storehouse' && b?.id) connectedToStorehouse.add(String(b.id))
      if (String(b.typeId) === 'storehouse' && a?.id) connectedToStorehouse.add(String(a.id))
    }
  }

  for (const b of buildings) {
    const typeId = String(b.typeId || '')
    const def = SIM_BUILDINGS[typeId]
    if (!def) continue
    const level = Math.max(1, Number((b as any).level ?? 1))
    const levelOutScale = 1 + 0.5 * (level - 1)
    const levelCapScale = 1 + 0.25 * (level - 1)
    const capacity = Math.round((def.workCapacity ?? 0) * levelCapScale)
    const assigned = Math.min(typeof b.workers === 'number' ? b.workers : 0, capacity)
    const ratio = capacity > 0 ? assigned / capacity : 1
    const traits = (b as any).traits || {}
    // Check inputs
    let canProduce = true
    for (const [k, v] of Object.entries(def.inputs)) {
      if (k === 'workers') continue
      const need = (Number(v ?? 0)) * ratio
      const cur = Number(resources[k as ResKey] ?? 0)
      if (cur < need) { canProduce = false; break }
    }
    if (!canProduce) continue
    // Consume inputs
    for (const [k, v] of Object.entries(def.inputs)) {
      let mult = 1
      if (typeId === 'sawmill' && k === 'wood' && (b as any).recipe === 'fine') mult = (4/3)
      if (typeId === 'trade_post' && k === 'grain' && (b as any).recipe === 'premium') mult = (3/2)
      const need = Math.max(0, Math.round((Number(v ?? 0)) * ratio * mult))
      if (k === 'workers') {
        workers = Math.max(0, workers - need)
      } else {
        const key = k as ResKey
        resources[key] = Math.max(0, Number(resources[key] ?? 0) - need)
      }
    }
    // Produce outputs
    for (const [k, v] of Object.entries(def.outputs)) {
      let out = (Number(v ?? 0)) * ratio * levelOutScale
      // adjacency bonuses
      if (typeId === 'trade_post' && k === 'coin') {
        const waterAdj = Math.min(2, Number(traits.waterAdj ?? 0))
        out += 2 * waterAdj
      }
      if (typeId === 'farm' && k === 'grain') {
        const waterAdj = Math.min(2, Number(traits.waterAdj ?? 0))
        out += 3 * waterAdj
      }
      if (typeId === 'lumber_camp' && k === 'wood') {
        const forestAdj = Math.min(3, Number(traits.forestAdj ?? 0))
        out += 2 * forestAdj
      }
      if (typeId === 'sawmill' && k === 'planks' && (b as any).recipe === 'fine') {
        out = (9) * ratio * levelOutScale
      }
      if ((b as any).id && connectedToStorehouse.has(String((b as any).id)) && (k === 'grain' || k === 'wood' || k === 'planks')) {
        out *= 1.15
      }
      if (typeId === 'shrine' && k === 'favor') {
        const mountainAdj = Math.min(2, Number(traits.mountainAdj ?? 0))
        out += 1 * mountainAdj
      }
      out = Math.max(0, Math.round(out))
      if (k === 'workers') {
        workers = Math.max(0, workers + out)
      } else {
        const key = k as ResKey
        resources[key] = Math.max(0, Number(resources[key] ?? 0) + out)
      }
    }
  }

  // Trade routes: add coin based on distance; minor unrest pressure
  if (routes2.length > 0) {
    const byId = new Map<string, any>((buildings as any).map((bb: any) => [String(bb.id), bb]))
    const MAX_ROUTE_LEN = 20
    for (const r of routes2) {
      const a = byId.get(String(r.fromId))
      const b = byId.get(String(r.toId))
      if (!a || !b) continue
      const dist = Math.abs(Number(a.x ?? 0) - Number(b.x ?? 0)) + Math.abs(Number(a.y ?? 0) - Number(b.y ?? 0))
      const length = Math.min(MAX_ROUTE_LEN, Number(r.length ?? dist))
      const coinGain = Math.max(1, Math.round(length * 0.5 * routeCoinMultiplier))
      resources.coin = Math.max(0, Number(resources.coin ?? 0) + coinGain)
    }
    let unrestBump = Math.floor(routes2.length / 2)
    // Tariffs add some unrest at high values
    if (tariffValue >= 60) unrestBump += 1
    if (patrolsEnabled) unrestBump = Math.max(0, unrestBump - 1)
    resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestBump)
    // Patrol upkeep
    if (patrolsEnabled) {
      resources.coin = Math.max(0, Number(resources.coin ?? 0) - 2)
    }
  }

  // Natural decay/pressure (wards decay => mana -5, unrest/threat scale with cycle)
  const unrestThreatDecay = 1 + Math.floor(Number(state.cycle) / 10)
  resources.mana = Math.max(0, Number(resources.mana ?? 0) - 5)
  resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestThreatDecay)
  resources.threat = Math.max(0, Number(resources.threat ?? 0) + unrestThreatDecay)

  // Worker upkeep: small grain consumption per worker (0.2 per worker, rounded)
  const upkeep = Math.max(0, Math.round(workers * 0.2))
  if (upkeep > 0) {
    resources.grain = Math.max(0, Number(resources.grain ?? 0) - upkeep)
  }

  // Crisis check
  let crisis: null | { type: 'unrest' | 'threat'; message: string; penalty: Record<string, number> } = null
  if (resources.unrest >= 80) {
    crisis = {
      type: 'unrest',
      message: 'Riots erupt across the dominion, draining supplies and goodwill.',
      penalty: { grain: -10, coin: -10, favor: -5 }
    }
  } else if (resources.threat >= 70) {
    crisis = {
      type: 'threat',
      message: 'Roving warbands harry the borders, sapping mana and favor.',
      penalty: { mana: -10, favor: -5 }
    }
  }

  if (crisis) {
    for (const [key, value] of Object.entries(crisis.penalty)) {
      resources[key] = Math.max(0, Number(resources[key] ?? 0) + value)
    }
  }

  // Increment cycle and persist max_cycle
  const newCycle = Number(state.cycle) + 1
  const newMax = Math.max(Number(state.max_cycle ?? 0), newCycle)
  let updated
  try {
    updated = await uow.gameStates.update(state.id, {
      cycle: newCycle,
      max_cycle: newMax,
      resources,
      workers,
      buildings: state.buildings ?? [],
      routes: (state as any).routes ?? [],
      updated_at: new Date().toISOString(),
    })
  } catch (upErr: any) {
    return NextResponse.json({ error: upErr.message }, { status: 500 })
  }

  // Mark proposals as applied
  if ((accepted?.length ?? 0) > 0) {
    await uow.proposals.updateMany(
      accepted!.map(p => p.id),
      { status: 'applied' },
    )
  }

  return NextResponse.json({ state: updated, crisis })
}

