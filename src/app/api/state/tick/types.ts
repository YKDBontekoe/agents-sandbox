import type { GameState } from '@engine'

export type EngineState = GameState

export type GameStateUpdatePayload = Pick<
  GameState,
  'cycle' | 'max_cycle' | 'resources' | 'workers' | 'buildings' | 'routes' | 'edicts'
> & {
  updated_at: string
  last_tick_at: string
}
