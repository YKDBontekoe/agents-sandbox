import type { GuildAgent, GameState, ProposalDraft, ScryResult } from '../types'

export const guild = 'Scribes'

function inferDelta(title: string, description: string): Record<string, number> {
  const t = `${title} ${description}`.toLowerCase()
  const delta: Record<string, number> = {}
  const add = (k: string, v: number) => { delta[k] = (delta[k] ?? 0) + v }
  if (t.includes('road')) {
    add('coin', +20); add('favor', +2); add('unrest', -1)
  } else if (t.includes('archive') || t.includes('record')) {
    add('coin', +10); add('mana', +2)
  } else {
    add('coin', +8); add('favor', +1)
  }
  return delta
}

const agent: GuildAgent = {
  async propose(_state: GameState): Promise<ProposalDraft[]> {
      void _state
    return [
      {
        title: 'Codex of Roads',
        description: 'Standardize measures and repair key road segments to ease trade.',
        predicted_delta: { coin: 20, favor: 2, unrest: -1 },
      },
      {
        title: 'Archives Reordering',
        description: 'Streamline record-keeping to reduce waste and duplication.',
        predicted_delta: { coin: 10, mana: 2 },
      },
    ]
  },
  async scry(proposal: ProposalDraft, _state: GameState): Promise<ScryResult> {
      void _state
    return { predicted_delta: inferDelta(proposal.title, proposal.description), risk_note: 'Deterministic sample estimate.' }
  },
}

export default agent
