import type { GameState, TickResult } from '@engine'

export type HeartbeatState = GameState

export type HeartbeatTickResult = TickResult

export interface HeartbeatUpdatePayload
  extends Pick<
    GameState,
    | 'cycle'
    | 'max_cycle'
    | 'resources'
    | 'workers'
    | 'buildings'
    | 'routes'
    | 'edicts'
    | 'quests_completed'
    | 'milestones'
    | 'era'
  > {
  updated_at: string
  last_tick_at: string
}
