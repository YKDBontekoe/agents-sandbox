import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface Params { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const supabase = createSupabaseServerClient()
  const { id } = params

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

  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}') + 1
    const parsed = JSON.parse(text.slice(start, end))

    // Update proposal predicted delta
    await supabase.from('proposals').update({ predicted_delta: parsed.predicted_delta }).eq('id', id)
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: 'Scry parse failed', raw: text }, { status: 500 })
  }
}