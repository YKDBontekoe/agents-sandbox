export interface GameState {
  id: string
  cycle: number
  resources: Record<string, number>
  workers?: number
  buildings?: unknown[]
  routes?: unknown[]
  edicts?: Record<string, number>
  skills?: string[]
  skill_tree_seed?: number
  updated_at: string
}

export interface GameStateRepository {
  getLatest(): Promise<GameState | null>
  getById(id: string): Promise<GameState | null>
  create(state: Partial<GameState>): Promise<GameState>
  update(id: string, updates: Partial<GameState>): Promise<GameState>
}
