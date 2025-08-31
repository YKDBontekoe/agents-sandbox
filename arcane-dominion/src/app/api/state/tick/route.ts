import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

  // Natural decay/pressure (wards decay => mana -5, unrest +1, threat +1)
  resources.mana = Math.max(0, Number(resources.mana ?? 0) - 5)
  resources.unrest = Math.max(0, Number(resources.unrest ?? 0) + 1)
  resources.threat = Math.max(0, Number(resources.threat ?? 0) + 1)

  // Increment cycle and persist
  const { data: updated, error: upErr } = await supabase
    .from('game_state')
    .update({ cycle: state.cycle + 1, resources, updated_at: new Date().toISOString() })
    .eq('id', state.id)
    .select('*')
    .single()
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Mark proposals as applied
  if ((accepted?.length ?? 0) > 0) {
    await supabase.from('proposals').update({ status: 'applied' }).in('id', accepted!.map(p => p.id))
  }

  return NextResponse.json(updated)
}
