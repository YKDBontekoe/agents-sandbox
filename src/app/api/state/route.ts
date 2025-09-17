import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@arcane/infrastructure/supabase'
import logger from '@/lib/logger'
import { z } from 'zod'
import type { GameState, BuildingData, RouteData } from '@engine'
import { config } from '@/infrastructure/config'

type OptionalKeys<T extends object> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]

function setOptionalField<T extends object, K extends OptionalKeys<T>>(target: Partial<T>, key: K, value: NonNullable<T[K]>) {
  target[key] = value
}

const BuildingDataSchema: z.ZodType<BuildingData> = z
  .object({
    id: z.string().optional(),
    typeId: z.string().optional(),
    workers: z.number().optional(),
    level: z.number().optional(),
    traits: z.record(z.string(), z.unknown()).optional(),
    recipe: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
  })
  .passthrough()

const RouteDataSchema: z.ZodType<RouteData> = z
  .object({
    id: z.string(),
    fromId: z.string(),
    toId: z.string(),
    length: z.number().optional(),
  })
  .passthrough()

const CharterPerksSchema = z
  .object({
    startingResources: z.record(z.string(), z.number()).optional(),
    startingBuildings: z.array(BuildingDataSchema).optional(),
    resourceOutputMultipliers: z.record(z.string(), z.number()).optional(),
    buildingOutputMultipliers: z.record(z.string(), z.number()).optional(),
    globalBuildingOutputMultiplier: z.number().positive().optional(),
    globalResourceOutputMultiplier: z.number().positive().optional(),
    routeCoinOutputMultiplier: z.number().positive().optional(),
    patrolCoinUpkeepMultiplier: z.number().positive().optional(),
    buildingInputMultiplier: z.number().positive().optional(),
    tickResourceAdjustments: z.record(z.string(), z.number()).optional(),
    upkeepGrainPerWorkerDelta: z.number().optional(),
    mapReveal: z
      .object({
        center: z.object({ x: z.number().int(), y: z.number().int() }),
        radius: z.number().nonnegative(),
      })
      .optional(),
  })
  .strict()

const FoundingCharterSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    perks: CharterPerksSchema,
  })
  .strict()

export async function GET() {
  try {
    const supabase = createSupabaseServerClient(config)
    const uow = new SupabaseUnitOfWork(supabase)

    let state = await uow.gameStates.getLatest()

    if (!state) {
      state = await uow.gameStates.create({
        skill_tree_seed: Math.floor(Math.random() * 1e9),
        auto_ticking: true,
        tick_interval_ms: 60000,
        last_tick_at: new Date().toISOString(),
        founding_charter: null,
      })
      return NextResponse.json(state)
    }

    const needsSeed = !state.skill_tree_seed
    const needsClockDefaults =
      typeof state.tick_interval_ms !== 'number' ||
      typeof state.auto_ticking !== 'boolean' ||
      !state.last_tick_at

    if (needsSeed || needsClockDefaults) {
      const patch: Partial<GameState> = {}
      if (needsSeed) setOptionalField(patch, 'skill_tree_seed', Math.floor(Math.random() * 1e9))
      if (needsClockDefaults) {
        if (typeof state.auto_ticking !== 'boolean') setOptionalField(patch, 'auto_ticking', true)
        if (typeof state.tick_interval_ms !== 'number') setOptionalField(patch, 'tick_interval_ms', 60000)
        if (!state.last_tick_at) setOptionalField(patch, 'last_tick_at', new Date().toISOString())
      }
      if (Object.keys(patch).length > 0) {
        const patched = await uow.gameStates.update(state.id, patch)
        return NextResponse.json(patched)
      }
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
  buildings: z.array(BuildingDataSchema).optional(),
  routes: z.array(RouteDataSchema).optional(),
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
  map_size: z.number().int().positive().optional(),
  founding_charter: FoundingCharterSchema.nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { id, resources, workers, buildings, routes, roads, citizens_seed, citizens_count, edicts, skills, skill_tree_seed, pinned_skill_targets, auto_ticking, tick_interval_ms, last_tick_at, map_size, founding_charter } = parsed.data
  const updates: Partial<GameState> = {}
  setOptionalField(updates, 'updated_at', new Date().toISOString())

  if (resources) updates.resources = resources
  if (typeof workers === 'number') setOptionalField(updates, 'workers', workers)
  if (buildings !== undefined) setOptionalField(updates, 'buildings', buildings)
  if (routes !== undefined) setOptionalField(updates, 'routes', routes)
  if (roads !== undefined) setOptionalField(updates, 'roads', roads)
  if (typeof citizens_seed === 'number') setOptionalField(updates, 'citizens_seed', citizens_seed)
  if (typeof citizens_count === 'number') setOptionalField(updates, 'citizens_count', citizens_count)
  if (edicts) setOptionalField(updates, 'edicts', edicts)
  if (skills !== undefined) setOptionalField(updates, 'skills', skills)
  if (typeof skill_tree_seed === 'number') setOptionalField(updates, 'skill_tree_seed', skill_tree_seed)
  if (pinned_skill_targets !== undefined) setOptionalField(updates, 'pinned_skill_targets', pinned_skill_targets)
  if (typeof auto_ticking === 'boolean') setOptionalField(updates, 'auto_ticking', auto_ticking)
  if (typeof tick_interval_ms === 'number') setOptionalField(updates, 'tick_interval_ms', tick_interval_ms)
  if (typeof last_tick_at === 'string') setOptionalField(updates, 'last_tick_at', last_tick_at)
  if (typeof map_size === 'number') setOptionalField(updates, 'map_size', map_size)
  if (Object.prototype.hasOwnProperty.call(parsed.data, 'founding_charter')) {
    updates.founding_charter = founding_charter ?? null
  }

  const supabase = createSupabaseServerClient(config)
  const uow = new SupabaseUnitOfWork(supabase)
  try {
    const data = await uow.gameStates.update(id, updates)
    return NextResponse.json(data)
  } catch (error: unknown) {
    let message = 'Unknown error'
    let details = ''
    
    if (error instanceof Error) {
      message = error.message
      details = error.stack || ''
    } else if (typeof error === 'object' && error !== null) {
      message = JSON.stringify(error, null, 2)
    } else {
      message = String(error)
    }
    
    logger.error('Supabase update error:', { message, details, error })
    console.error('Full error object:', error)
    return NextResponse.json({ error: message, details }, { status: 500 })
  }
}
