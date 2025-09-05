import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { queryBus } from '@/application/bus'
import { GetLatestStateQuery } from '@/application/queries/getLatestState'

export async function GET() {
  try {
    const state = await queryBus.execute(new GetLatestStateQuery())
    return NextResponse.json(state)
  } catch (error: any) {
    logger.error('State fetch error:', error)
    return NextResponse.json(
      { error: error.message },
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
  const { data, error } = await supabase
    .from('game_state')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    logger.error('Supabase update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
