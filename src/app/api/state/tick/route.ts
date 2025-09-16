import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { config } from '@/infrastructure/config'
import { SupabaseUnitOfWork } from '@arcane/infrastructure/supabase'
import { processTick, SIM_BUILDINGS } from '@engine'
import type { GameStateUpdatePayload, EngineState } from './types'

// Advance one cycle: delegate to engine and persist results
export async function POST() {
  const supabase = createSupabaseServerClient(config)
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  const accepted = await uow.proposals.listByState(state.id, ['accepted'])

  const { state: nextState, crisis } = processTick(state, accepted, SIM_BUILDINGS)
  const isoNow = new Date().toISOString()
  const updatePayload: GameStateUpdatePayload = {
    cycle: nextState.cycle,
    max_cycle: nextState.max_cycle,
    resources: nextState.resources,
    workers: nextState.workers,
    buildings: nextState.buildings ?? [],
    routes: nextState.routes ?? [],
    edicts: nextState.edicts ?? undefined,
    updated_at: isoNow,
    last_tick_at: isoNow,
  }

  let updated: EngineState = nextState
  try {
    updated = await uow.gameStates.update(state.id, updatePayload)
  } catch (upErr: unknown) {
    const message = upErr instanceof Error ? upErr.message : String(upErr)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (accepted.length > 0) {
    await uow.proposals.updateMany(
      accepted.map(p => p.id),
      { status: 'applied' },
    )
  }

  if (crisis) {
    const disableAutoTick: Partial<EngineState> = { auto_ticking: false }
    try {
      updated = await uow.gameStates.update(state.id, disableAutoTick)
    } catch {}
  }
  return NextResponse.json({ state: updated, crisis })
}
