import { generateProposals, ProposalGenerator } from '@/domain/services/ProposalService';
import { GameState } from '@/domain/entities/GameState';
import { Proposal } from '@/domain/entities/Proposal';

export interface DbAdapter {
  getLatestState(): Promise<GameState | null>;
  insertProposals(rows: Proposal[]): Promise<Proposal[]>;
}

export async function generateProposal({ db, ai, guild }: { db: DbAdapter; ai?: ProposalGenerator; guild: string }) {
  const state = await db.getLatestState();
  if (!state) {
    throw new Error('No game state');
  }
  const proposals = await generateProposals(state, guild, ai);
  const rows = proposals.map((p) => ({ ...p, state_id: state.id, status: 'pending' as const }));
  return db.insertProposals(rows);
}
