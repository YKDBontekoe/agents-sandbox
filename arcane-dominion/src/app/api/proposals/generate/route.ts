import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BodySchema = z.object({
  guild: z.string().optional(),
})

const ProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  predicted_delta: z.record(z.number()),
})

const AIResponseSchema = z.array(ProposalSchema)

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

  // Get latest state
  const { data: state, error: stateErr } = await supabase
    .from('game_state')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 })
  if (!state) return NextResponse.json({ error: 'No game state' }, { status: 400 })

  // Use AI to draft 1-3 proposals aligned with README fantasy
  const system = `You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas.
Resources: grain, coin, mana, favor, unrest, threat.
Guilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy).
Return JSON array, each item: { title, description, predicted_delta: {resource:number,...} }`

  const user = `Current cycle: ${state.cycle}\nResources: ${JSON.stringify(state.resources)}\nGuild: ${guild}\nGenerate 2 proposals rooted in this guild focus and the game's tone.`

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system,
    prompt: user,
  })

  let parsedJson: unknown
  try {
    const jsonStart = text.indexOf('[')
    const jsonEnd = text.lastIndexOf(']') + 1
    parsedJson = JSON.parse(text.slice(jsonStart, jsonEnd))
  } catch {
    return NextResponse.json(
      { error: 'AI response parse failed', raw: text },
      { status: 400 },
    )
  }
  const proposalsResult = AIResponseSchema.safeParse(parsedJson)
  if (!proposalsResult.success) {
    return NextResponse.json(
      { error: proposalsResult.error.message },
      { status: 400 },
    )
  }
  const proposals = proposalsResult.data

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