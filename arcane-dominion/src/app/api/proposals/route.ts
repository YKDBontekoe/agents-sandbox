import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Mock proposals for development when Supabase is not configured
const mockProposals: any[] = []

export async function GET(_req: NextRequest) {
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
      console.warn('Supabase error in proposals route, returning mock data:', stateErr.message)
      return NextResponse.json({ proposals: mockProposals })
    }
    if (!state) return NextResponse.json({ proposals: [] })

    const { data: proposals, error: propErr } = await supabase
      .from('proposals')
      .select('*')
      .eq('state_id', state.id)
      .in('status', ['pending', 'accepted', 'rejected'])
      .order('created_at', { ascending: false })
    if (propErr) {
      console.warn('Supabase error fetching proposals, returning mock data:', propErr.message)
      return NextResponse.json({ proposals: mockProposals })
    }

    return NextResponse.json({ proposals })
  } catch (error) {
    console.warn('Supabase connection error in proposals route, returning mock data:', error)
    return NextResponse.json({ proposals: mockProposals })
  }
}