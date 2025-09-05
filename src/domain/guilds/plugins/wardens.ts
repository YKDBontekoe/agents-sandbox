import type { GuildAgent, GameState, ProposalDraft, ScryResult } from '../types'

export const guild = 'Wardens'

function inferDelta(title: string, description: string): Record<string, number> {
  const t = `${title} ${description}`.toLowerCase()
  const delta: Record<string, number> = {}
  const add = (k: string, v: number) => { delta[k] = (delta[k] ?? 0) + v }
  if (t.includes('fortify') || t.includes('wall')) {
    add('threat', -3); add('unrest', -1); add('coin', -10)
  } else if (t.includes('patrol') || t.includes('wild')) {
    add('threat', -2); add('favor', +1); add('coin', -5)
  } else {
    add('threat', -2); add('coin', -6)
  }
  return delta
}

const agent: GuildAgent = {
  async propose(_state: GameState): Promise<ProposalDraft[]> {
    void _state
    return [
      {
        title: 'Fortify the Outer Walls',
        description: 'Repair battlements and station extra sentries along the perimeter.',
        predicted_delta: { threat: -3, unrest: -1, coin: -10 },
      },
      {
        title: 'Patrol the Wilds',
        description: 'Sweep nearby forests for raiders and lurking beasts.',
        predicted_delta: { threat: -2, favor: 1, coin: -5 },
      },
    ]
  },
  async scry(proposal: ProposalDraft, _state: GameState): Promise<ScryResult> {
      void _state
    return { predicted_delta: inferDelta(proposal.title, proposal.description), risk_note: 'Deterministic sample estimate.' }
  },
}

export default agent
