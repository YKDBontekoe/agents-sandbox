import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { SIM_BUILDINGS } from '@/lib/buildingCatalog'
import { processTick } from '@engine'

// Heartbeat: apply due ticks based on last_tick_at and tick_interval_ms
export async function POST() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  const auto = (state as any).auto_ticking as boolean | undefined
  const interval = Number((state as any).tick_interval_ms ?? 60000)
  const lastStr = (state as any).last_tick_at as string | undefined
  if (!auto) return NextResponse.json({ ok: true, message: 'auto_ticking disabled' })

  const now = Date.now()
  let last = lastStr ? Date.parse(lastStr) : (state.updated_at ? Date.parse(state.updated_at) : now)
  if (!Number.isFinite(last)) last = now

  const maxPerCall = 3
  let applied = 0
  let currentState = state

  while (now - last >= interval && applied < maxPerCall) {
    const accepted = await uow.proposals.listByState(currentState.id, ['accepted'])
    const { state: nextState, crisis } = processTick(currentState as any, accepted ?? [], SIM_BUILDINGS)

    const newLast = new Date(last + interval).toISOString()
    const updates: Partial<typeof nextState> = {
      cycle: nextState.cycle,
      max_cycle: nextState.max_cycle,
      resources: nextState.resources,
      workers: nextState.workers,
      buildings: nextState.buildings ?? [],
      routes: nextState.routes ?? [],
      edicts: nextState.edicts ?? undefined,
      updated_at: new Date().toISOString(),
      last_tick_at: newLast as any,
    }

    currentState = await uow.gameStates.update(currentState.id, updates as any)
    if ((accepted?.length ?? 0) > 0) {
      await uow.proposals.updateMany(accepted!.map(p => p.id), { status: 'applied' })
    }
    applied += 1
    last = Date.parse(newLast)
    // If a crisis fired, stop auto-ticking by pausing
    if (crisis) {
      currentState = await uow.gameStates.update(currentState.id, { auto_ticking: false } as any)
      break
    }
  }

  return NextResponse.json({ applied, state: currentState })
}

