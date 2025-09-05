import { createSupabaseServerClient } from '@/lib/supabase/server'

export class ProposalRepository {
  async findById(id: string) {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async recordDecision(id: string, decision: 'accept' | 'reject', comment?: string) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase
      .from('decisions')
      .insert({ proposal_id: id, decision, comment })
    if (error) throw new Error(error.message)
  }

  async updateStatus(id: string, status: string) {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }
}
