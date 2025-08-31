import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: state, error } = await supabase
    .from('game_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If no state, create one
  if (!state) {
    const { data: created, error: createErr } = await supabase
      .from('game_state')
      .insert({})
      .select('*')
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
    return NextResponse.json(created)
  }

  return NextResponse.json(state)
}