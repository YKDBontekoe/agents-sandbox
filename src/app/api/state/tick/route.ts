import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { SIM_BUILDINGS } from '@engine'
import { processTick } from '@engine'

// Advance one cycle: delegate to engine and persist results
export async function POST() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  const accepted = await uow.proposals.listByState(state.id, ['accepted'])

  const { state: nextState, crisis } = processTick(state as any, accepted ?? [], SIM_BUILDINGS)

  let updated
  try {
    updated = await uow.gameStates.update(state.id, {
      cycle: nextState.cycle,
      max_cycle: nextState.max_cycle,
      resources: nextState.resources,
      workers: nextState.workers,
      buildings: nextState.buildings ?? [],
      routes: nextState.routes ?? [],
      edicts: nextState.edicts ?? undefined,
      updated_at: new Date().toISOString(),
      last_tick_at: new Date().toISOString() as any,
    })
  } catch (upErr: unknown) {
    const message = upErr instanceof Error ? upErr.message : String(upErr)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if ((accepted?.length ?? 0) > 0) {
    await uow.proposals.updateMany(
      accepted!.map(p => p.id),
      { status: 'applied' },
    )
  }

  if (crisis) {
    try { updated = await uow.gameStates.update(state.id, { auto_ticking: false } as any) } catch {}
  }
  return NextResponse.json({ state: updated, crisis })
}
