export type ProposalStatus = 'pending' | 'accepted' | 'rejected' | 'applied'

export interface Proposal {
  id: string
  state_id: string
  guild: string
  title: string
  description: string
  predicted_delta: Record<string, number>
  status: ProposalStatus
  created_at?: string
}

export interface ProposalRepository {
  listByState(stateId: string, statuses?: ProposalStatus[]): Promise<Proposal[]>
  getById(id: string): Promise<Proposal | null>
  create(proposals: Omit<Proposal, 'id'>[]): Promise<Proposal[]>
  update(id: string, changes: Partial<Omit<Proposal, 'id'>>): Promise<Proposal>
  updateMany(ids: string[], changes: Partial<Omit<Proposal, 'id'>>): Promise<void>
}
