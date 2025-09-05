import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GameState } from '@/domain/entities/GameState';
import { Proposal } from '@/domain/entities/Proposal';

export function createSupabaseAdapter() {
  const client = createSupabaseServerClient();
  return {
    async getLatestState(): Promise<GameState | null> {
      const { data, error } = await client
        .from('game_state')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as any;
    },
    async getAcceptedProposals(stateId: string): Promise<Proposal[]> {
      const { data, error } = await client
        .from('proposals')
        .select('*')
        .eq('state_id', stateId)
        .eq('status', 'accepted');
      if (error) throw new Error(error.message);
      return (data as any) || [];
    },
    async updateState(id: string, state: GameState): Promise<GameState> {
      const { data, error } = await client
        .from('game_state')
        .update({
          cycle: state.cycle,
          max_cycle: state.max_cycle,
          resources: state.resources,
          workers: state.workers,
          buildings: state.buildings ?? [],
          routes: state.routes ?? [],
          updated_at: state.updated_at,
        })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as any;
    },
    async markProposalsApplied(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      const { error } = await client
        .from('proposals')
        .update({ status: 'applied' })
        .in('id', ids);
      if (error) throw new Error(error.message);
    },
    async insertProposals(rows: Proposal[]): Promise<Proposal[]> {
      const { data, error } = await client
        .from('proposals')
        .insert(rows)
        .select('*');
      if (error) throw new Error(error.message);
      return data as any;
    },
  };
}
