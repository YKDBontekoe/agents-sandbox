import type { GuildAgent, GameState, ProposalDraft, ScryResult } from '../types'

export const guild = 'Stewards'

function inferDelta(title: string, description: string): Record<string, number> {
  const t = `${title} ${description}`.toLowerCase()
  const delta: Record<string, number> = {}
  const add = (k: string, v: number) => { delta[k] = (delta[k] ?? 0) + v }
  if (t.includes('market')) {
    add('unrest', -3); add('favor', +2); add('coin', -5)
  } else if (t.includes('festival') || t.includes('civic')) {
    add('unrest', -2); add('favor', +3); add('coin', -8)
  } else {
    add('unrest', -1); add('favor', +1); add('coin', -4)
  }
  return delta
}

const agent: GuildAgent = {
  async propose(_state: GameState): Promise<ProposalDraft[]> {
      void _state
    return [
      {
        title: 'Calm the Markets',
        description: 'Institute fair pricing and resolve merchant disputes.',
        predicted_delta: { unrest: -3, favor: 2, coin: -5 },
      },
      {
        title: 'Civic Festival',
        description: 'A modest festival to raise spirits and cohesion.',
        predicted_delta: { unrest: -2, favor: 3, coin: -8 },
      },
    ]
  },
  async scry(proposal: ProposalDraft, _state: GameState): Promise<ScryResult> {
      void _state
    return { predicted_delta: inferDelta(proposal.title, proposal.description), risk_note: 'Deterministic sample estimate.' }
  },
}

export default agent
