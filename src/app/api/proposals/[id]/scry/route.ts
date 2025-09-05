import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { config } from '@/infrastructure/config'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { accumulateEffects, generateSkillTree } from '@/components/game/skills/procgen'
import { rateLimit } from '@/middleware/rateLimit'
import { buildGameContext } from '@/lib/gameContext'

interface GameState {
  resources?: Record<string, number>
  buildings?: Array<{ typeId?: string; traits?: Record<string, unknown> }>
  routes?: unknown[]
  skills?: string[]
  skill_tree_seed?: number
}

const openai = createOpenAI({ apiKey: config.openAiApiKey })

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({})

const AIResponseSchema = z.object({
  predicted_delta: z.record(z.string(), z.number()),
  risk_note: z.string(),
})

// Minimal shape for proposals to avoid 'any' usages
interface ProposalRow {
  guild?: string
  title?: string
  description?: string
}

export async function POST(req: NextRequest, context: RouteContext) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const limit = Number(process.env.PROPOSAL_RATE_LIMIT ?? '5')
  if (!rateLimit(ip, { limit })) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  const params = await context.params
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const bodyResult = BodySchema.safeParse(body)
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: bodyResult.error.message },
      { status: 400 },
    )
  }

  const proposal = await uow.proposals.getById(id)
  if (!proposal) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  const gameState = await uow.gameStates.getById(proposal.state_id)

  const hasOpenAI = !!config.openAiApiKey &&
    !config.openAiApiKey.includes('your_openai_api_key_here') &&
    !config.openAiApiKey.toLowerCase().includes('placeholder')

  // Deterministic fallback when OpenAI is not configured
  if (!hasOpenAI) {
    const p = proposal as unknown as ProposalRow
    const guild = String(p.guild ?? '')
    const title = String(p.title ?? '')
    const description = String(p.description ?? '')

    function inferDelta() {
      const t = `${title} ${description}`.toLowerCase()
      const delta: Record<string, number> = {}
      const add = (k: string, v: number) => {
        delta[k] = (delta[k] ?? 0) + v
      }

      // Wardens heuristics
      if (guild.toLowerCase().includes('warden')) {
        if (t.includes('fortify') || t.includes('wall')) {
          add('threat', -3); add('unrest', -1); add('coin', -10)
        } else if (t.includes('patrol') || t.includes('wild')) {
          add('threat', -2); add('favor', +1); add('coin', -5)
        } else {
          add('threat', -2); add('coin', -6)
        }
      }

      // Alchemists heuristics
      else if (guild.toLowerCase().includes('alchem')) {
        if (t.includes('mana') || t.includes('distill')) {
          add('mana', +15); add('coin', -10)
        } else if (t.includes('fertil') || t.includes('field')) {
          add('grain', +120); add('coin', -15)
        } else {
          add('mana', +8); add('coin', -8)
        }
      }

      // Scribes heuristics
      else if (guild.toLowerCase().includes('scribe')) {
        if (t.includes('road')) {
          add('coin', +20); add('favor', +2); add('unrest', -1)
        } else if (t.includes('archive') || t.includes('record')) {
          add('coin', +10); add('mana', +2)
        } else {
          add('coin', +8); add('favor', +1)
        }
      }

      // Stewards heuristics
      else if (guild.toLowerCase().includes('steward')) {
        if (t.includes('market')) {
          add('unrest', -3); add('favor', +2); add('coin', -5)
        } else if (t.includes('festival') || t.includes('civic')) {
          add('unrest', -2); add('favor', +3); add('coin', -8)
        } else {
          add('unrest', -1); add('favor', +1); add('coin', -4)
        }
      }

      // Default minimal conservative estimate
      else {
        add('unrest', -1); add('coin', -5)
      }

      return delta
    }

    const predicted_delta = inferDelta()
    await uow.proposals.update(id, { predicted_delta })
    return NextResponse.json({
      predicted_delta,
      risk_note: 'Deterministic fallback estimate based on guild heuristics (no OpenAI configured).',
    })
  }

  const system = `You are a scrying oracle. Given a proposal and current state context (resources, buildings, routes, terrain, skill modifiers), forecast likely deltas conservatively.
Return strict JSON: { predicted_delta: {resource:number,...}, risk_note: string }`

  const p = proposal as ProposalRow
  const stateRes = gameState?.resources ?? {}
  const extraContext = buildGameContext(gameState)
  const user = `Context: ${JSON.stringify({ resources: stateRes, ...extraContext })}\nProposal: ${String(p.title ?? '')} - ${String(p.description ?? '')}`
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

  await uow.proposals.update(id, { predicted_delta: parsed.data.predicted_delta })
  return NextResponse.json(parsed.data)
}