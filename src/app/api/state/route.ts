import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import logger from '@/lib/logger'
import { z } from 'zod'
import type { GameState } from '@engine'

export async function GET() {
  try {
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
      return NextResponse.json(state)
    }

    const needsSeed = !state.skill_tree_seed
    const needsClockDefaults = typeof (state as any).tick_interval_ms !== 'number' || typeof (state as any).auto_ticking !== 'boolean' || !(state as any).last_tick_at
    if (needsSeed || needsClockDefaults) {
      const patch: Partial<GameState & { auto_ticking: boolean; tick_interval_ms: number; last_tick_at: string }> = {}
      if (needsSeed) patch.skill_tree_seed = Math.floor(Math.random() * 1e9)
      if (needsClockDefaults) {
        if (typeof (state as any).auto_ticking !== 'boolean') (patch as any).auto_ticking = true
        if (typeof (state as any).tick_interval_ms !== 'number') (patch as any).tick_interval_ms = 60000
        if (!(state as any).last_tick_at) (patch as any).last_tick_at = new Date().toISOString()
      }
      const patched = await uow.gameStates.update(state.id, patch as Partial<GameState>)
      return NextResponse.json(patched)
    }

    return NextResponse.json(state)
  } catch (error) {
    logger.error('Supabase connection error:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  resources: z.record(z.string(), z.number()).optional(),
  workers: z.number().optional(),
  buildings: z.array(z.unknown()).optional(),
  routes: z.array(z.unknown()).optional(),
  roads: z.array(z.object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() })).optional(),
  citizens_seed: z.number().int().optional(),
  citizens_count: z.number().int().optional(),
  edicts: z.record(z.string(), z.number()).optional(),
  skills: z.array(z.string()).optional(),
  skill_tree_seed: z.number().int().optional(),
  pinned_skill_targets: z.array(z.string()).optional(),
  auto_ticking: z.boolean().optional(),
  tick_interval_ms: z.number().int().positive().optional(),
  last_tick_at: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { id, resources, workers, buildings, routes, roads, citizens_seed, citizens_count, edicts, skills, skill_tree_seed, pinned_skill_targets, auto_ticking, tick_interval_ms, last_tick_at } = parsed.data
  const updates: Partial<{ resources: Record<string, number>; workers: number; buildings: unknown[]; routes: unknown[]; roads: Array<{x:number;y:number}>; citizens_seed: number; citizens_count: number; edicts: Record<string, number>; skills: string[]; skill_tree_seed: number; pinned_skill_targets: string[]; updated_at: string; auto_ticking: boolean; tick_interval_ms: number; last_tick_at: string }> = { updated_at: new Date().toISOString() }
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

  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  try {
    const data = await uow.gameStates.update(id, updates as Partial<GameState>)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Supabase update error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
