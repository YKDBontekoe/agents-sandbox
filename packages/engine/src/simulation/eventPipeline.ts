import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import type { SimulatedBuilding } from './buildings';
import type { Citizen } from './citizens/citizen';
import type { WorkerProfile } from './workers/types';
import { EventManager } from './events/EventManager';
import type { ActiveEvent, VisualIndicator } from './events/types';

export interface EventPipelineInput {
  gameTime: GameTime;
  buildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  resources: SimResources;
}

export interface EventPipelineResult {
  activeEvents: ActiveEvent[];
  visualIndicators: VisualIndicator[];
  systemHealth: ReturnType<EventManager['getSystemHealth']>;
}

export function runEventPipeline(
  eventManager: EventManager,
  input: EventPipelineInput
): EventPipelineResult {
  eventManager.updateEvents(input.gameTime, {
    buildings: input.buildings,
    citizens: input.citizens,
    workers: input.workers,
    resources: input.resources
  });

  return {
    activeEvents: eventManager.getActiveEvents(),
    visualIndicators: eventManager.getVisualIndicators(),
    systemHealth: eventManager.getSystemHealth()
  };
}
