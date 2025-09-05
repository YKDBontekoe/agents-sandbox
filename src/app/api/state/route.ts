import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { z } from 'zod'
import { GameStateSchema } from '@/lib/schemas'

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
        .insert({ skill_tree_seed: Math.floor(Math.random() * 1e9) })
        .select('*')
        .single()
      if (createErr) {
        logger.error('Supabase create error:', createErr.message)
        return NextResponse.json(
          { error: 'Failed to create game state' },
          { status: 503 }
        )
      }
      const parsed = GameStateSchema.safeParse(created)
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.message },
          { status: 500 },
        )
      }
      return NextResponse.json(parsed.data)
    }

    if (!state.skill_tree_seed) {
      const { data: patched } = await supabase
        .from('game_state')
        .update({ skill_tree_seed: Math.floor(Math.random() * 1e9) })
        .eq('id', state.id)
        .select('*')
        .maybeSingle()
      const patchedState = patched || state
      const parsedPatched = GameStateSchema.safeParse(patchedState)
      if (!parsedPatched.success) {
        return NextResponse.json(
          { error: parsedPatched.error.message },
          { status: 500 },
        )
      }
      return NextResponse.json(parsedPatched.data)
    }
    const parsedState = GameStateSchema.safeParse(state)
    if (!parsedState.success) {
      return NextResponse.json(
        { error: parsedState.error.message },
        { status: 500 },
      )
    }
    return NextResponse.json(parsedState.data)
  } catch (error) {
    logger.error('Supabase connection error:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}

const UpdateSchema = GameStateSchema.pick({
  resources: true,
  workers: true,
  buildings: true,
  routes: true,
  edicts: true,
  skills: true,
  skill_tree_seed: true,
})
  .partial()
  .extend({ id: z.string().uuid() })

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

  const parsedData = GameStateSchema.safeParse(data)
  if (!parsedData.success) {
    return NextResponse.json(
      { error: parsedData.error.message },
      { status: 500 },
    )
  }
  return NextResponse.json(parsedData.data)
}
