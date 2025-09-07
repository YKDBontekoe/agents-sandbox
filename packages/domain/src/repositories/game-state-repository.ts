import type { GameState } from '@engine'

export type { GameState }

export interface GameStateRepository {
  getLatest(): Promise<GameState | null>
  getById(id: string): Promise<GameState | null>
  create(state: Partial<GameState>): Promise<GameState>
  update(id: string, updates: Partial<GameState>): Promise<GameState>
}
