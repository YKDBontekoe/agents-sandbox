import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SupabaseUnitOfWork } from '@/infrastructure/supabase/unit-of-work'
import { config } from '@/infrastructure/config'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { buildGameContext } from '@/lib/gameContext'

const openai = createOpenAI({ apiKey: config.openAiApiKey })

export async function listProposals() {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const state = await uow.gameStates.getLatest()
  if (!state) return []
  const proposals = await uow.proposals.listByState(state.id, ['pending', 'accepted', 'rejected'])
  return proposals ?? []
}

const ProposalSchema = z.object({
  title: z.string(),
  description: z.string(),
  predicted_delta: z.record(z.string(), z.number()),
})
const AIResponseSchema = z.array(ProposalSchema)

export async function generateProposals(guild: string) {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const state = await uow.gameStates.getLatest()
  if (!state) throw new Error('No game state')

  const hasOpenAI = !!config.openAiApiKey &&
    !config.openAiApiKey.includes('your_openai_api_key_here') &&
    !config.openAiApiKey.toLowerCase().includes('placeholder')

  if (!hasOpenAI) {
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
    const inserted = await uow.proposals.create(rows)
    return inserted
  }

  const system = `You are an autonomous guild agent in a fantasy realm management game. Propose concise, actionable proposals with predicted resource deltas.
Resources: grain, coin, mana, favor, unrest, threat.
Guilds: Wardens(defense), Alchemists(resources), Scribes(infra), Stewards(policy).
Return JSON array, each item: { title, description, predicted_delta: {resource:number,...} }`

  const gameContext = buildGameContext(state)
  const context = {
    cycle: state.cycle,
    resources: state.resources,
    guild,
    skill_tree_seed: state.skill_tree_seed ?? 12345,
    ...gameContext,
  }
  const user = `Context: ${JSON.stringify(context)}\nGenerate 2 proposals rooted in this guild focus and the game's tone. Keep predicted_delta conservative and numeric. JSON only.`

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    system,
    prompt: user,
  })

  const jsonStart = text.indexOf('[')
  const jsonEnd = text.lastIndexOf(']') + 1
  const parsedJson = JSON.parse(text.slice(jsonStart, jsonEnd))
  const proposalsResult = AIResponseSchema.safeParse(parsedJson)
  if (!proposalsResult.success) throw new Error(proposalsResult.error.message)
  const proposals = proposalsResult.data
  const rows = proposals.map(p => ({
    state_id: state.id,
    guild,
    title: p.title,
    description: p.description,
    predicted_delta: p.predicted_delta,
    status: 'pending' as const,
  }))
  const inserted = await uow.proposals.create(rows)
  return inserted
}

const ScrySchema = z.object({
  predicted_delta: z.record(z.string(), z.number()),
  risk_note: z.string(),
})

interface ProposalRow {
  guild?: string
  title?: string
  description?: string
}

export async function scryProposal(id: string) {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const proposal = await uow.proposals.getById(id)
  if (!proposal) throw new Error('Proposal not found')
  if (!proposal.state_id) throw new Error('Proposal missing state reference')
  const gameState = await uow.gameStates.getById(proposal.state_id)

  const hasOpenAI = !!config.openAiApiKey &&
    !config.openAiApiKey.includes('your_openai_api_key_here') &&
    !config.openAiApiKey.toLowerCase().includes('placeholder')

  if (!hasOpenAI) {
    const p = proposal as unknown as ProposalRow
    const guild = String(p.guild ?? '')
    const title = String(p.title ?? '')
    const description = String(p.description ?? '')

    function inferDelta() {
      const t = `${title} ${description}`.toLowerCase()
      const delta: Record<string, number> = {}
      const add = (k: string, v: number) => { delta[k] = (delta[k] ?? 0) + v }

      if (guild.toLowerCase().includes('warden')) {
        if (t.includes('fortify') || t.includes('wall')) { add('threat', -3); add('unrest', -1); add('coin', -10) }
        else if (t.includes('patrol') || t.includes('wild')) { add('threat', -2); add('favor', +1); add('coin', -5) }
        else { add('threat', -2); add('coin', -6) }
      } else if (guild.toLowerCase().includes('alchem')) {
        if (t.includes('mana') || t.includes('distill')) { add('mana', +15); add('coin', -10) }
        else if (t.includes('fertil') || t.includes('field')) { add('grain', +120); add('coin', -15) }
        else { add('mana', +8); add('coin', -8) }
      } else if (guild.toLowerCase().includes('scribe')) {
        if (t.includes('road')) { add('coin', +20); add('favor', +2); add('unrest', -1) }
        else if (t.includes('archive') || t.includes('record')) { add('coin', +10); add('mana', +2) }
        else { add('coin', +8); add('favor', +1) }
      } else if (guild.toLowerCase().includes('steward')) {
        if (t.includes('market')) { add('unrest', -3); add('favor', +2); add('coin', -5) }
        else if (t.includes('festival') || t.includes('civic')) { add('unrest', -2); add('favor', +3); add('coin', -8) }
        else { add('unrest', -1); add('favor', +1); add('coin', -4) }
      } else {
        add('unrest', -1); add('coin', -5)
      }
      return delta
    }

    const predicted_delta = inferDelta()
    await uow.proposals.update(id, { predicted_delta })
    return { predicted_delta, risk_note: 'Deterministic fallback estimate based on guild heuristics (no OpenAI configured).' }
  }

  const system = `You are a scrying oracle. Given a proposal and current state context (resources, buildings, routes, terrain, skill modifiers), forecast likely deltas conservatively.
Return strict JSON: { predicted_delta: {resource:number,...}, risk_note: string }`
  const p = proposal as ProposalRow
  const stateRes = gameState?.resources ?? {}
  const extraContext = buildGameContext(gameState)
  const user = `Context: ${JSON.stringify({ resources: stateRes, ...extraContext })}\nProposal: ${String(p.title ?? '')} - ${String(p.description ?? '')}`
  const { text } = await generateText({ model: openai('gpt-4o-mini'), system, prompt: user })
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}') + 1
  const parsedJson = JSON.parse(text.slice(start, end))
  const parsed = ScrySchema.safeParse(parsedJson)
  if (!parsed.success) throw new Error(parsed.error.message)
  await uow.proposals.update(id, { predicted_delta: parsed.data.predicted_delta })
  return parsed.data
}

export async function decideProposal(id: string, decision: 'accept' | 'reject', comment?: string) {
  const supabase = createSupabaseServerClient()
  const uow = new SupabaseUnitOfWork(supabase)
  const prop = await uow.proposals.getById(id)
  if (!prop) throw new Error('Proposal not found')
  const { error: decErr } = await supabase.from('decisions').insert({ proposal_id: id, decision, comment })
  if (decErr) throw new Error(decErr.message)
  const status = decision === 'accept' ? 'accepted' : 'rejected'
  await uow.proposals.update(id, { status })
  return { ok: true }
}

