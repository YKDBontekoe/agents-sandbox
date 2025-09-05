import { runTick as runTickDomain } from '@/domain/services/TickService';
import { GameState } from '@/domain/entities/GameState';
import { Proposal } from '@/domain/entities/Proposal';

export interface DbAdapter {
  getLatestState(): Promise<GameState | null>;
  getAcceptedProposals(stateId: string): Promise<Proposal[]>;
  updateState(id: string, state: GameState): Promise<GameState>;
  markProposalsApplied(ids: string[]): Promise<void>;
}

export async function runTick({ db }: { db: DbAdapter }) {
  const state = await db.getLatestState();
  if (!state) {
    throw new Error('No game state');
  }
  const accepted = await db.getAcceptedProposals(state.id);
  const { state: newState, crisis } = runTickDomain(state, accepted);
  const updated = await db.updateState(state.id, newState);
  if (accepted.length > 0) {
    await db.markProposalsApplied(accepted.map((p) => String(p.id)));
  }
  return { state: updated, crisis };
}
