import { GameStateRepository } from './game-state-repository'
import { ProposalRepository } from './proposal-repository'

export interface UnitOfWork {
  gameStates: GameStateRepository
  proposals: ProposalRepository
  complete(): Promise<void>
}
