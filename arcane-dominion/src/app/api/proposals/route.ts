import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient()

  // Get latest state
  const { data: state, error: stateErr } = await supabase
    .from('game_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })
  if (!state) return NextResponse.json({ proposals: [] })

  const { data: proposals, error: propErr } = await supabase
    .from('proposals')
    .select('*')
    .eq('state_id', state.id)
    .in('status', ['pending', 'accepted', 'rejected'])
    .order('created_at', { ascending: false })
  if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

  return NextResponse.json({ proposals })
}