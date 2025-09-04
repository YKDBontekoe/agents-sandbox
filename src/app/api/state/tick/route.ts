import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Minimal server-side catalog for building production. Mirrors client SIM_BUILDINGS where relevant.
type ResKey = 'grain' | 'coin' | 'mana' | 'favor' | 'unrest' | 'threat';
type MaybeWorkers = ResKey | 'workers';
interface ServerBuildingDef {
  inputs: Partial<Record<MaybeWorkers, number>>;
  outputs: Partial<Record<MaybeWorkers, number>>;
  workCapacity?: number;
}

const SERVER_BUILDINGS: Record<string, ServerBuildingDef> = {
  // New base + economy buildings
  council_hall: { inputs: {}, outputs: { favor: 1 }, workCapacity: 0 },
  trade_post: { inputs: { grain: 2 }, outputs: { coin: 8 }, workCapacity: 0 },
  automation_workshop: { inputs: { mana: 1 }, outputs: { coin: 6 }, workCapacity: 0 },
  // Existing sample buildings (subset; ignore workers on server)
  farm: { inputs: { coin: 1 }, outputs: { grain: 10 }, workCapacity: 5 },
  house: { inputs: { grain: 1 }, outputs: { /* workers: 5 */ }, workCapacity: 0 },
  shrine: { inputs: { mana: 1 }, outputs: { favor: 2 }, workCapacity: 2 },
};

// Advance one cycle: apply accepted proposals to resources with simple rules and clear applied
export async function POST() {
  const supabase = createSupabaseServerClient()

  // Get latest state
  const { data: state, error: stateErr } = await supabase
    .from('game_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  // Fetch accepted proposals
  const { data: accepted, error: propErr } = await supabase
    .from('proposals')
    .select('*')
    .eq('state_id', state.id)
    .eq('status', 'accepted')
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

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
  for (const b of buildings) {
    const typeId = String(b.typeId || '')
    const def = SERVER_BUILDINGS[typeId]
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
      const need = Math.max(0, Math.round((Number(v ?? 0)) * ratio))
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
  const routes: Array<{ id: string; fromId: string; toId: string; length?: number }> = Array.isArray((state as any).routes) ? (state as any).routes as any : []
  if (routes.length > 0) {
    const byId = new Map<string, any>((buildings as any).map((bb: any) => [String(bb.id), bb]))
    const MAX_ROUTE_LEN = 20
    for (const r of routes) {
      const a = byId.get(String(r.fromId))
      const b = byId.get(String(r.toId))
      if (!a || !b) continue
      const dist = Math.abs(Number(a.x ?? 0) - Number(b.x ?? 0)) + Math.abs(Number(a.y ?? 0) - Number(b.y ?? 0))
      const length = Math.min(MAX_ROUTE_LEN, Number(r.length ?? dist))
      const coinGain = Math.max(1, Math.round(length * 0.5 * routeCoinMultiplier))
      resources.coin = Math.max(0, Number(resources.coin ?? 0) + coinGain)
    }
    let unrestBump = Math.floor(routes.length / 2)
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
  const { data: updated, error: upErr } = await supabase
    .from('game_state')
    .update({
      cycle: newCycle,
      max_cycle: newMax,
      resources,
      workers,
      buildings: state.buildings ?? [],
      routes: (state as any).routes ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', state.id)
    .select('*')
    .single()
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Mark proposals as applied
  if ((accepted?.length ?? 0) > 0) {
    await supabase.from('proposals').update({ status: 'applied' }).in('id', accepted!.map(p => p.id))
  }

  return NextResponse.json({ state: updated, crisis })
}
