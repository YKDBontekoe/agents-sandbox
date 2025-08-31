import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({})

const AIResponseSchema = z.object({
  predicted_delta: z.record(z.string(), z.number()),
  risk_note: z.string(),
})

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

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*, game_state(*)')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })

  const system = `You are a scrying oracle. Given a proposal and current resources, forecast likely deltas in a conservative, numeric way.
Return JSON: { predicted_delta: {resource:number,...}, risk_note: string }`

  const user = `Resources: ${JSON.stringify(proposal.game_state.resources)}\nProposal: ${proposal.title} - ${proposal.description}`
  const { text } = await generateText({ model: openai('gpt-4o-mini'), system, prompt: user })

  let parsedJson: unknown
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}') + 1
    parsedJson = JSON.parse(text.slice(start, end))
  } catch {
    return NextResponse.json(
      { error: 'Scry parse failed', raw: text },
      { status: 400 },
    )
  }
  const parsed = AIResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }

  await supabase.from('proposals').update({ predicted_delta: parsed.data.predicted_delta }).eq('id', id)
  return NextResponse.json(parsed.data)
}