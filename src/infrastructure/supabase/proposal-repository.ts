import type { SupabaseClient } from '@supabase/supabase-js'
import { Proposal, ProposalRepository, ProposalStatus } from '@arcane/domain/repositories/proposal-repository'

export class SupabaseProposalRepository implements ProposalRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByState(stateId: string, statuses?: ProposalStatus[]): Promise<Proposal[]> {
    let query = this.client.from('proposals').select('*').eq('state_id', stateId)
    if (statuses && statuses.length) {
      query = query.in('status', statuses)
    }
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Proposal[]
  }

  async getById(id: string): Promise<Proposal | null> {
    const { data, error } = await this.client.from('proposals').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return (data as Proposal) || null
  }

  async create(proposals: Omit<Proposal, 'id'>[]): Promise<Proposal[]> {
    const { data, error } = await this.client.from('proposals').insert(proposals).select('*')
    if (error) throw error
    return (data ?? []) as Proposal[]
  }

  async update(id: string, changes: Partial<Omit<Proposal, 'id'>>): Promise<Proposal> {
    const { data, error } = await this.client.from('proposals').update(changes).eq('id', id).select('*').single()
    if (error) throw error
    return data as Proposal
  }

  async updateMany(ids: string[], changes: Partial<Omit<Proposal, 'id'>>): Promise<void> {
    const { error } = await this.client.from('proposals').update(changes).in('id', ids)
    if (error) throw error
  }
}
