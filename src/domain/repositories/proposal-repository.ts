export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'applied'

import type { Proposal as EngineProposal } from '@engine'

export interface Proposal extends EngineProposal {
  guild: string
  title: string
  description: string
  status: ProposalStatus
  created_at?: string
  gen_prompt_version?: string | null
  gen_model_version?: string | null
  scry_prompt_version?: string | null
  scry_model_version?: string | null
}

export interface ProposalRepository {
  listByState(stateId: string, statuses?: ProposalStatus[]): Promise<Proposal[]>
  getById(id: string): Promise<Proposal | null>
  create(proposals: Omit<Proposal, 'id'>[]): Promise<Proposal[]>
  update(id: string, changes: Partial<Omit<Proposal, 'id'>>): Promise<Proposal>
  updateMany(ids: string[], changes: Partial<Omit<Proposal, 'id'>>): Promise<void>
}
