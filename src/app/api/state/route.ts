import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'
import { getLatestGameState } from '@/lib/server/gameState'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { state, error } = await getLatestGameState(supabase)
    if (error) return error

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
          { status: 503 },
        )
      }
      return NextResponse.json(created)
    }

    return NextResponse.json(state)
  } catch (error) {
    logger.error('Supabase connection error:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 },
    )
  }
}
