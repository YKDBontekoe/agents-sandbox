/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import type { GameState } from '@engine'

export async function getState() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  let state = await uow.gameStates.getLatest()
  if (!state) {
    state = await uow.gameStates.create({
      skill_tree_seed: Math.floor(Math.random() * 1e9),
      auto_ticking: true,
      tick_interval_ms: 60000,
      last_tick_at: new Date().toISOString(),
    })
    return state
  }

  const needsSeed = !state.skill_tree_seed
  const needsClockDefaults =
    typeof (state as any).tick_interval_ms !== 'number' ||
    typeof (state as any).auto_ticking !== 'boolean' ||
    !(state as any).last_tick_at

  if (needsSeed || needsClockDefaults) {
    const patch: Partial<GameState & { auto_ticking: boolean; tick_interval_ms: number; last_tick_at: string }> = {}
    if (needsSeed) patch.skill_tree_seed = Math.floor(Math.random() * 1e9)
    if (needsClockDefaults) {
      if (typeof (state as any).auto_ticking !== 'boolean') (patch as any).auto_ticking = true
      if (typeof (state as any).tick_interval_ms !== 'number') (patch as any).tick_interval_ms = 60000
      if (!(state as any).last_tick_at) (patch as any).last_tick_at = new Date().toISOString()
    }
    const patched = await uow.gameStates.update(state.id, patch as Partial<GameState>)
    return patched
  }

  return state
}

export interface UpdateStateParams {
  id: string
  resources?: Record<string, number>
  workers?: number
  buildings?: unknown[]
  routes?: unknown[]
  roads?: Array<{ x: number; y: number }>
  citizens_seed?: number
  citizens_count?: number
  edicts?: Record<string, number>
  skills?: string[]
  skill_tree_seed?: number
  pinned_skill_targets?: string[]
  auto_ticking?: boolean
  tick_interval_ms?: number
  last_tick_at?: string
  map_size?: number
}

export async function updateState(params: UpdateStateParams) {
  const {
    id,
    resources,
    workers,
    buildings,
    routes,
    roads,
    citizens_seed,
    citizens_count,
    edicts,
    skills,
    skill_tree_seed,
    pinned_skill_targets,
    auto_ticking,
    tick_interval_ms,
    last_tick_at,
    map_size,
  } = params

  const updates: Partial<{
    resources: Record<string, number>
    workers: number
    buildings: unknown[]
    routes: unknown[]
    roads: Array<{ x: number; y: number }>
    citizens_seed: number
    citizens_count: number
    edicts: Record<string, number>
    skills: string[]
    skill_tree_seed: number
    pinned_skill_targets: string[]
    updated_at: string
    auto_ticking: boolean
    tick_interval_ms: number
    last_tick_at: string
    map_size: number
  }> = { updated_at: new Date().toISOString() }

  if (resources) updates.resources = resources
  if (typeof workers === 'number') updates.workers = workers
  if (buildings) updates.buildings = buildings
  if (routes) updates.routes = routes
  if (roads) updates.roads = roads
  if (typeof citizens_seed === 'number') updates.citizens_seed = citizens_seed
  if (typeof citizens_count === 'number') updates.citizens_count = citizens_count
  if (edicts) updates.edicts = edicts
  if (skills) updates.skills = skills
  if (typeof skill_tree_seed === 'number') updates.skill_tree_seed = skill_tree_seed
  if (pinned_skill_targets) (updates as any).pinned_skill_targets = pinned_skill_targets
  if (typeof auto_ticking === 'boolean') (updates as any).auto_ticking = auto_ticking
  if (typeof tick_interval_ms === 'number') (updates as any).tick_interval_ms = tick_interval_ms
  if (typeof last_tick_at === 'string') (updates as any).last_tick_at = last_tick_at
  if (typeof map_size === 'number') updates.map_size = map_size

  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const data = await uow.gameStates.update(id, updates as Partial<GameState>)
  return data
}

import { SIM_BUILDINGS, processTick } from '@engine'

export async function tickState() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) throw new Error('No game state')

  const accepted = await uow.proposals.listByState(state.id, ['accepted'])
  const { state: nextState, crisis } = processTick(state as any, accepted ?? [], SIM_BUILDINGS)

  let updated = await uow.gameStates.update(state.id, {
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

  if ((accepted?.length ?? 0) > 0) {
    await uow.proposals.updateMany(
      accepted!.map(p => p.id),
      { status: 'applied' },
    )
  }

  if (crisis) {
    try { updated = await uow.gameStates.update(state.id, { auto_ticking: false } as any) } catch { }
  }

  return { state: updated, crisis }
}

export async function heartbeatState() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)

  const state = await uow.gameStates.getLatest()
  if (!state) throw new Error('No game state')

  const auto = (state as any).auto_ticking as boolean | undefined
  const interval = Number((state as any).tick_interval_ms ?? 60000)
  const lastStr = (state as any).last_tick_at as string | undefined
  if (!auto) return { applied: 0, state }

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
    if (crisis) {
      currentState = await uow.gameStates.update(currentState.id, { auto_ticking: false } as any)
      break
    }
  }

  return { applied, state: currentState }
}

