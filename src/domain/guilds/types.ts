export interface GameState {
  id: string
  cycle: number
  resources: Record<string, number>
  buildings?: Array<{ typeId?: string; traits?: Record<string, unknown> }>
  routes?: unknown[]
  skills?: string[]
  skill_tree_seed?: number
}

export interface ProposalDraft {
  title: string
  description: string
  predicted_delta: Record<string, number>
}

export interface ScryResult {
  predicted_delta: Record<string, number>
  risk_note: string
}

export interface GuildAgent {
  /**
   * Generate proposals for the guild based on current game state.
   */
  propose(state: GameState): Promise<ProposalDraft[]>
  /**
   * Forecast the outcome of a proposal.
   */
  scry(proposal: ProposalDraft, state: GameState): Promise<ScryResult>
}
