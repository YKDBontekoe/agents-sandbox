import type { GuildAgent, GameState, ProposalDraft, ScryResult } from '../types'

export const guild = 'Alchemists'

function inferDelta(title: string, description: string): Record<string, number> {
  const t = `${title} ${description}`.toLowerCase()
  const delta: Record<string, number> = {}
  const add = (k: string, v: number) => { delta[k] = (delta[k] ?? 0) + v }
  if (t.includes('mana') || t.includes('distill')) {
    add('mana', +15); add('coin', -10)
  } else if (t.includes('fertil') || t.includes('field')) {
    add('grain', +120); add('coin', -15)
  } else {
    add('mana', +8); add('coin', -8)
  }
  return delta
}

const agent: GuildAgent = {
  async propose(_state: GameState): Promise<ProposalDraft[]> {
      void _state
    return [
      {
        title: 'Distill Mana Salts',
        description: 'Convert surplus reagents into refined mana for the leyworks.',
        predicted_delta: { mana: 15, coin: -10 },
      },
      {
        title: 'Fertilize the Fields',
        description: 'Apply alchemical tonics to boost crop yield.',
        predicted_delta: { grain: 120, coin: -15 },
      },
    ]
  },
  async scry(proposal: ProposalDraft, _state: GameState): Promise<ScryResult> {
      void _state
    return { predicted_delta: inferDelta(proposal.title, proposal.description), risk_note: 'Deterministic sample estimate.' }
  },
}

export default agent
