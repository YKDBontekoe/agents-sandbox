import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import logger from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()

    // Get latest state
    const { data: state, error: stateErr } = await supabase
      .from('game_state')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (stateErr) {
      logger.error('Supabase error in proposals route:', stateErr.message)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      )
    }
    if (!state) return NextResponse.json({ proposals: [] })

    const { data: proposals, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('state_id', state.id)
      .in('status', ['pending', 'accepted', 'rejected'])
      .order('created_at', { ascending: false })
    if (propErr) {
      logger.error('Supabase error fetching proposals:', propErr.message)
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: 503 }
      )
    }

    return NextResponse.json({ proposals })
  } catch (error) {
    logger.error('Supabase connection error in proposals route:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}