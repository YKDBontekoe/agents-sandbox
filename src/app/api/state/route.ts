import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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