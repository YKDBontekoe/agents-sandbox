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
  for (const b of buildings) {
    const typeId = String(b.typeId || '')
    const def = SERVER_BUILDINGS[typeId]
    if (!def) continue
    const capacity = def.workCapacity ?? 0
    const assigned = Math.min(typeof b.workers === 'number' ? b.workers : 0, capacity)
    const ratio = capacity > 0 ? assigned / capacity : 1
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
      if (k === 'workers') continue
      const need = (Number(v ?? 0)) * ratio
      const key = k as ResKey
      resources[key] = Math.max(0, Number(resources[key] ?? 0) - need)
    }
    // Produce outputs
    for (const [k, v] of Object.entries(def.outputs)) {
      if (k === 'workers') continue // server does not track workers as a resource
      const out = (Number(v ?? 0)) * ratio
      const key = k as ResKey
      resources[key] = Math.max(0, Number(resources[key] ?? 0) + out)
    }
  }

  // Natural decay/pressure (wards decay => mana -5, unrest/threat scale with cycle)
  const unrestThreatDecay = 1 + Math.floor(Number(state.cycle) / 10)
  resources.mana = Math.max(0, Number(resources.mana ?? 0) - 5)
  resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + unrestThreatDecay)
  resources.threat = Math.max(0, Number(resources.threat ?? 0) + unrestThreatDecay)

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
      workers: state.workers ?? 0,
      buildings: state.buildings ?? [],
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
