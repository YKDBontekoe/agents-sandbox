import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { z } from 'zod'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: state, error } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.error('Supabase error:', error.message)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 503 }
      )
    }

    // If no state, create one
    if (!state) {
      const { data: created, error: createErr } = await supabase
        .from('game_state')
        .insert({})
        .select('*')
        .single()
      if (createErr) {
        logger.error('Supabase create error:', createErr.message)
        return NextResponse.json(
          { error: 'Failed to create game state' },
          { status: 503 }
        )
      }
      return NextResponse.json(created)
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
  resources: z.record(z.number()).optional(),
  workers: z.number().optional(),
  buildings: z.array(z.any()).optional(),
})

export async function PATCH(req: NextRequest) {
  const json = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { id, resources, workers, buildings } = parsed.data
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (resources) updates.resources = resources
  if (typeof workers === 'number') updates.workers = workers
  if (buildings) updates.buildings = buildings

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