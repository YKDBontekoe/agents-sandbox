import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { accumulateEffects, generateSkillTree } from '@/components/game/skills/procgen'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const BodySchema = z.object({
  guild: z.string().optional(),
})

const ProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  predicted_delta: z.record(z.string(), z.number()),
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

  const hasOpenAI = !!process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.includes('your_openai_api_key_here') &&
    !process.env.OPENAI_API_KEY.toLowerCase().includes('placeholder')

  if (!hasOpenAI) {
    // Deterministic, rule-based fallback when OpenAI is not configured
    const guildMap: Record<string, { title: string; desc: string; delta: Record<string, number> }[]> = {
      Wardens: [
        { title: 'Fortify the Outer Walls', desc: 'Repair battlements and station extra sentries along the perimeter.', delta: { threat: -3, unrest: -1, coin: -10 } },
        { title: 'Patrol the Wilds', desc: 'Sweep nearby forests for raiders and lurking beasts.', delta: { threat: -2, favor: +1, coin: -5 } },
      ],
      Alchemists: [
        { title: 'Distill Mana Salts', desc: 'Convert surplus reagents into refined mana for the leyworks.', delta: { mana: +15, coin: -10 } },
        { title: 'Fertilize the Fields', desc: 'Apply alchemical tonics to boost crop yield.', delta: { grain: +120, coin: -15 } },
      ],
      Scribes: [
        { title: 'Codex of Roads', desc: 'Standardize measures and repair key road segments to ease trade.', delta: { coin: +20, favor: +2, unrest: -1 } },
        { title: 'Archives Reordering', desc: 'Streamline record-keeping to reduce waste and duplication.', delta: { coin: +10, mana: +2 } },
      ],
      Stewards: [
        { title: 'Calm the Markets', desc: 'Institute fair pricing and resolve merchant disputes.', delta: { unrest: -3, favor: +2, coin: -5 } },
        { title: 'Civic Festival', desc: 'A modest festival to raise spirits and cohesion.', delta: { unrest: -2, favor: +3, coin: -8 } },
      ],
    }
    const picks = guildMap[guild] ?? guildMap['Wardens']

    const rows = picks.slice(0, 2).map(p => ({
      state_id: state.id,
      guild,
      title: p.title,
      description: p.desc,
      predicted_delta: p.delta,
      status: 'pending' as const,
    }))

    const { data: inserted, error: insErr } = await supabase.from('proposals').insert(rows).select('*')
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    return NextResponse.json(inserted)
  }

  // Use AI to draft 1-3 proposals aligned with README fantasy
  const system = `You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas.
Resources: grain, coin, mana, favor, unrest, threat.
Guilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy).
Return JSON array, each item: { title, description, predicted_delta: {resource:number,...} }`

  // Build planning context
  const buildings: Array<{ typeId?: string; traits?: Record<string, any> }> = Array.isArray((state as any).buildings) ? (state as any).buildings as any : []
  const routes: Array<any> = Array.isArray((state as any).routes) ? (state as any).routes as any : []
  const byType: Record<string, number> = {}
  let farmsNearWater = 0, shrinesNearMountains = 0, campsNearForest = 0
  for (const b of buildings) {
    const t = String(b.typeId || '')
    byType[t] = (byType[t] ?? 0) + 1
    const tr = (b as any).traits || {}
    if (t === 'farm' && Number(tr.waterAdj || 0) > 0) farmsNearWater++
    if (t === 'shrine' && Number(tr.mountainAdj || 0) > 0) shrinesNearMountains++
    if (t === 'lumber_camp' && Number(tr.forestAdj || 0) > 0) campsNearForest++
  }
  const storehousePresent = (byType['storehouse'] ?? 0) > 0
  const routesCount = routes.length
  const terrainSummary = { farmsNearWater, shrinesNearMountains, campsNearForest }
  // Compute skill modifiers if state.skills present
  let skillModifiers: any = { resource_multipliers: {}, building_multipliers: {}, upkeep_grain_per_worker_delta: 0 }
  const skills: string[] = Array.isArray((state as any).skills) ? (state as any).skills as any : []
  if (skills.length > 0) {
    try {
      const tree = generateSkillTree((state as any).skill_tree_seed ?? 12345)
      const unlocked = tree.nodes.filter(n => skills.includes(n.id))
      const acc = accumulateEffects(unlocked)
      skillModifiers = {
        resource_multipliers: acc.resMul,
        building_multipliers: acc.bldMul,
        upkeep_grain_per_worker_delta: acc.upkeepDelta,
      }
    } catch {}
  }

  const context = {
    cycle: state.cycle,
    resources: state.resources,
    guild,
    skill_tree_seed: (state as any).skill_tree_seed ?? 12345,
    buildings_by_type: byType,
    routes_count: routesCount,
    storehouse_present: storehousePresent,
    terrain_summary: terrainSummary,
    skill_modifiers: skillModifiers,
  }

  const user = `Context: ${JSON.stringify(context)}\nGenerate 2 proposals rooted in this guild focus and the game's tone. Keep predicted_delta conservative and numeric. JSON only.`

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
