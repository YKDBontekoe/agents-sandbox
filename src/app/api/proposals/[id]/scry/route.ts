import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { accumulateEffects, generateSkillTree } from '@/components/game/skills/procgen'
import { AIScrySchema, ProposalSchema, GameStateSchema } from '@/lib/schemas'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface RouteContext {
  params: Promise<{ id: string }>
}

const BodySchema = z.object({})

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
  const proposalParsed = ProposalSchema.safeParse(proposalRow)
  if (!proposalParsed.success) {
    return NextResponse.json({ error: proposalParsed.error.message }, { status: 500 })
  }
  const proposal = proposalParsed.data
  const gameStateParsed = GameStateSchema.safeParse(proposalRow.game_state)
  const gameState = gameStateParsed.success ? gameStateParsed.data : undefined

  const hasOpenAI = !!process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.includes('your_openai_api_key_here') &&
    !process.env.OPENAI_API_KEY.toLowerCase().includes('placeholder')

  // Deterministic fallback when OpenAI is not configured
  if (!hasOpenAI) {
    const guild = proposal.guild
    const title = proposal.title
    const description = proposal.description

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
    await supabase.from('proposals').update({ predicted_delta }).eq('id', id)
    return NextResponse.json({
      predicted_delta,
      risk_note: 'Deterministic fallback estimate based on guild heuristics (no OpenAI configured).',
    })
  }

  const system = `You are a scrying oracle. Given a proposal and current state context (resources, buildings, routes, terrain, skill modifiers), forecast likely deltas conservatively.
Return strict JSON: { predicted_delta: {resource:number,...}, risk_note: string }`

  const p = proposal
  const {
    resources: stateRes = {},
    buildings = [],
    routes = [],
    skills = [],
    skill_tree_seed,
  } = gameState ?? {}
  const byType: Record<string, number> = {}
  let farmsNearWater = 0, shrinesNearMountains = 0, campsNearForest = 0
  for (const b of buildings) {
    const t = String(b.typeId || '')
    byType[t] = (byType[t] ?? 0) + 1
    const tr = b.traits || {}
    if (t === 'farm' && Number(tr.waterAdj || 0) > 0) farmsNearWater++
    if (t === 'shrine' && Number(tr.mountainAdj || 0) > 0) shrinesNearMountains++
    if (t === 'lumber_camp' && Number(tr.forestAdj || 0) > 0) campsNearForest++
  }
  type SkillModifiers = {
    resource_multipliers: Record<string, number>
    building_multipliers: Record<string, number>
    upkeep_grain_per_worker_delta: number
  }
  let skillModifiers: SkillModifiers = {
    resource_multipliers: {},
    building_multipliers: {},
    upkeep_grain_per_worker_delta: 0,
  }
  if (skills.length > 0) {
    try {
      const tree = generateSkillTree(skill_tree_seed ?? 12345)
      const unlocked = tree.nodes.filter(n => skills.includes(n.id))
      const acc = accumulateEffects(unlocked)
      skillModifiers = {
        resource_multipliers: acc.resMul,
        building_multipliers: acc.bldMul,
        upkeep_grain_per_worker_delta: acc.upkeepDelta,
      }
    } catch {}
  }

  const gameContext = {
    resources: stateRes,
    buildings_by_type: byType,
    routes_count: routes.length,
    storehouse_present: (byType['storehouse'] ?? 0) > 0,
    terrain_summary: { farmsNearWater, shrinesNearMountains, campsNearForest },
    skill_modifiers: skillModifiers,
  }
  const user = `Context: ${JSON.stringify(gameContext)}\nProposal: ${String(p.title ?? '')} - ${String(p.description ?? '')}`
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
  const parsed = AIScrySchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message },
      { status: 400 },
    )
  }

  await supabase.from('proposals').update({ predicted_delta: parsed.data.predicted_delta }).eq('id', id)
  return NextResponse.json(parsed.data)
}