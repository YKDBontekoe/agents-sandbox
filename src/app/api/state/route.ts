import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { getState, updateState, UpdateStateParams } from '@application'

export async function GET() {
  try {
    const state = await getState()
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
  map_size: z.number().int().positive().optional(),
})

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  try {
    const data = await updateState(parsed.data as UpdateStateParams)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Supabase update error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
