import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Mock game state for development when Supabase is not configured
const mockGameState = {
  id: 'mock-game-state-id',
  created_at: new Date().toISOString(),
  cycle: 1,
  resources: {
    grain: 100,
    coin: 50,
    mana: 75,
    favor: 25,
    unrest: 10,
    threat: 5
  },
  notes: 'Mock game state for development'
}

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
      console.error('Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Database connection failed' },
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
        console.error('Supabase create error:', createErr.message)
        return NextResponse.json(
          { error: 'Failed to create game state' },
          { status: 503 }
        )
      }
      return NextResponse.json(created)
    }

    return NextResponse.json(state)
  } catch (error) {
    console.error('Supabase connection error:', error)
    return NextResponse.json(
      { error: 'Service unavailable - database not configured' },
      { status: 503 }
    )
  }
}