import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import logger from '@/lib/logger'
import { z } from 'zod'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const uow = new SupabaseUnitOfWork(supabase)

    let state = await uow.gameStates.getLatest()

    if (!state) {
      state = await uow.gameStates.create({
        skill_tree_seed: Math.floor(Math.random() * 1e9),
      })
      return NextResponse.json(state)
    }

    if (!state.skill_tree_seed) {
      const patched = await uow.gameStates.update(state.id, {
        skill_tree_seed: Math.floor(Math.random() * 1e9),
      })
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
  edicts: z.record(z.string(), z.number()).optional(),
  skills: z.array(z.string()).optional(),
  skill_tree_seed: z.number().int().optional(),
})

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { id, resources, workers, buildings, routes, edicts, skills, skill_tree_seed } = parsed.data
  const updates: Partial<{ resources: Record<string, number>; workers: number; buildings: unknown[]; routes: unknown[]; edicts: Record<string, number>; skills: string[]; skill_tree_seed: number; updated_at: string }> = { updated_at: new Date().toISOString() }
  if (resources) updates.resources = resources
  if (typeof workers === 'number') updates.workers = workers
  if (buildings) updates.buildings = buildings
  if (routes) updates.routes = routes
  if (edicts) updates.edicts = edicts
  if (skills) updates.skills = skills
  if (typeof skill_tree_seed === 'number') updates.skill_tree_seed = skill_tree_seed

  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  try {
    const data = await uow.gameStates.update(id, updates)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Supabase update error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
