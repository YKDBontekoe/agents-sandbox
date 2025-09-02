import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLatestGameState } from '@/lib/server/gameState'

// Advance one cycle: apply accepted proposals to resources with simple rules and clear applied
export async function POST() {
  const supabase = createSupabaseServerClient()

  const { state, error } = await getLatestGameState(supabase)
  if (error) return error
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
    .update({ cycle: newCycle, max_cycle: newMax, resources, updated_at: new Date().toISOString() })
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
