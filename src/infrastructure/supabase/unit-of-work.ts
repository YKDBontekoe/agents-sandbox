import type { SupabaseClient } from '@supabase/supabase-js'
import type { UnitOfWork as UoW } from '@arcane/domain/repositories/unit-of-work'
import { SupabaseGameStateRepository } from './game-state-repository'
import { SupabaseProposalRepository } from './proposal-repository'

export class SupabaseUnitOfWork implements UoW {
  public readonly gameStates: SupabaseGameStateRepository
  public readonly proposals: SupabaseProposalRepository

  constructor(private readonly client: SupabaseClient) {
    this.gameStates = new SupabaseGameStateRepository(client)
    this.proposals = new SupabaseProposalRepository(client)
  }

  async complete(): Promise<void> {
    // Supabase auto-commits each statement; transactions require serverless functions.
    // This method exists for interface compatibility.
  }
}
