import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getGuildAgent } from '@/domain/guilds/registry'
import type { GameState, ProposalDraft } from '@/domain/guilds/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({})

interface ProposalRow {
  id?: string
  guild?: string
  title?: string
  description?: string
  predicted_delta?: Record<string, number>
  game_state?: GameState
}

export async function POST(req: NextRequest, context: RouteContext) {
  const params = await context.params
  const supabase = createSupabaseServerClient()
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const bodyResult = BodySchema.safeParse(body)
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: bodyResult.error.message },
      { status: 400 },
    )
  }

  const { data: proposalRow, error } = await supabase
    .from('proposals')
    .select('*, game_state(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!proposalRow) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const proposal = proposalRow as unknown as ProposalRow
  const guild = String(proposal.guild ?? '')
  const state = proposal.game_state as GameState | undefined
  const agent = await getGuildAgent(guild)
  if (!agent || !state) {
    return NextResponse.json({ error: `No agent for guild ${guild}` }, { status: 400 })
  }

  const result = await agent.scry(
    {
      title: String(proposal.title ?? ''),
      description: String(proposal.description ?? ''),
      predicted_delta: proposal.predicted_delta ?? {},
    } as ProposalDraft,
    state,
  )

  await supabase.from('proposals').update({ predicted_delta: result.predicted_delta }).eq('id', id)
  return NextResponse.json(result)
}
