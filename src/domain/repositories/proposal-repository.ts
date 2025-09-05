export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'applied'

import type { Proposal } from '@engine'

export type { Proposal }

export interface ProposalRepository {
  listByState(stateId: string, statuses?: ProposalStatus[]): Promise<Proposal[]>
  getById(id: string): Promise<Proposal | null>
  create(proposals: Omit<Proposal, 'id'>[]): Promise<Proposal[]>
  update(id: string, changes: Partial<Omit<Proposal, 'id'>>): Promise<Proposal>
  updateMany(ids: string[], changes: Partial<Omit<Proposal, 'id'>>): Promise<void>
}
