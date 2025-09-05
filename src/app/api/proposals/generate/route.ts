import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getGuildAgent } from '@/domain/guilds/registry'
import type { GameState } from '@/domain/guilds/types'

const BodySchema = z.object({
  guild: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const json = await req.json().catch(() => ({}))
  const parsedBody = BodySchema.safeParse(json)
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.message },
      { status: 400 },
    )
  }
  const { guild = 'Wardens' } = parsedBody.data

  const { data: stateRow, error: stateErr } = await supabase
    .from('game_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })
  const state = stateRow as GameState | null
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  const agent = await getGuildAgent(guild)
  if (!agent) {
    return NextResponse.json({ error: `No agent for guild ${guild}` }, { status: 400 })
  }

  const proposals = await agent.propose(state)
  const rows = proposals.map(p => ({
    state_id: state.id,
    guild,
    title: p.title,
    description: p.description,
    predicted_delta: p.predicted_delta,
    status: 'pending' as const,
  }))

  const { data: inserted, error: insErr } = await supabase.from('proposals').insert(rows).select('*')
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  return NextResponse.json(inserted)
}
