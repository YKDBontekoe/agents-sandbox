import type { GameState, TickResult } from '@engine'

export interface HeartbeatState extends GameState {}

export interface HeartbeatTickResult extends TickResult {}

export interface HeartbeatUpdatePayload
  extends Pick<GameState, 'cycle' | 'max_cycle' | 'resources' | 'workers' | 'buildings' | 'routes' | 'edicts'> {
  updated_at: string
  last_tick_at: string
}
