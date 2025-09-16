import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@arcane/infrastructure/supabase'
import { SIM_BUILDINGS, processTick } from '@engine'
import { config } from '@/infrastructure/config'
import type { HeartbeatState, HeartbeatTickResult, HeartbeatUpdatePayload } from './types'

// Heartbeat: apply due ticks based on last_tick_at and tick_interval_ms
export async function POST() {
  const supabase = createSupabaseServerClient(config)
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  let currentState: HeartbeatState = state

  const auto = currentState.auto_ticking
  const interval = Number(currentState.tick_interval_ms ?? 60000)
  const lastStr = currentState.last_tick_at
  if (!auto) return NextResponse.json({ ok: true, message: 'auto_ticking disabled' })

  const now = Date.now()
  let last = lastStr ? Date.parse(lastStr) : (currentState.updated_at ? Date.parse(currentState.updated_at) : now)
  if (!Number.isFinite(last)) last = now

  const maxPerCall = 3
  let applied = 0

  while (now - last >= interval && applied < maxPerCall) {
    const accepted = await uow.proposals.listByState(currentState.id, ['accepted'])
    const tickResult: HeartbeatTickResult = processTick(currentState, accepted, SIM_BUILDINGS)
    const { state: nextState, crisis } = tickResult

    const newLast = new Date(last + interval).toISOString()
    const updates: HeartbeatUpdatePayload = {
      cycle: nextState.cycle,
      max_cycle: nextState.max_cycle,
      resources: nextState.resources,
      workers: nextState.workers,
      buildings: nextState.buildings ?? [],
      routes: nextState.routes ?? [],
      edicts: nextState.edicts ?? undefined,
      updated_at: new Date().toISOString(),
      last_tick_at: newLast,
    }

    currentState = await uow.gameStates.update(currentState.id, updates)
    if (accepted.length > 0) {
      await uow.proposals.updateMany(accepted.map(p => p.id), { status: 'applied' })
    }
    applied += 1
    last = Date.parse(newLast)
    // If a crisis fired, stop auto-ticking by pausing
    if (crisis) {
      currentState = await uow.gameStates.update(currentState.id, { auto_ticking: false })
      break
    }
  }

  return NextResponse.json({ applied, state: currentState })
}

