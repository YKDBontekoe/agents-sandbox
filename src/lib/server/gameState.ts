import { NextResponse } from 'next/server'
import logger from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getLatestGameState(supabase: SupabaseClient) {
  try {
    const { data: state, error } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      logger.error('Supabase error fetching game state:', error.message)
      return {
        state: null,
        error: NextResponse.json(
          { error: 'Database connection failed' },
          { status: 503 },
        ),
      }
    }

    return { state, error: null }
  } catch (err) {
    logger.error('Supabase connection error fetching game state:', err)
    return {
      state: null,
      error: NextResponse.json(
        { error: 'Service unavailable - database not configured' },
        { status: 503 },
      ),
    }
  }
}
