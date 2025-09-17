import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import type { ActiveEvent } from './events/types';
import type { SimulatedBuilding } from './buildingSimulation';
import { CitizenBehaviorSystem } from './citizenBehavior';
import type { Citizen } from './citizens/citizen';

export interface CitizenPipelineInput {
  gameTime: GameTime;
  buildings: SimulatedBuilding[];
  resources: SimResources;
  activeEvents: ActiveEvent[];
  threatLevel: number;
}

export interface CitizenPipelineResult {
  citizens: Citizen[];
  communityMood: { happiness: number; stress: number; satisfaction: number };
}

export function runCitizenPipeline(
  citizenSystem: CitizenBehaviorSystem,
  input: CitizenPipelineInput
): CitizenPipelineResult {
  const citizens = citizenSystem.getAllCitizens();
  const activeEventTypes = input.activeEvents.map(event => event.type);

  for (const citizen of citizens) {
    citizenSystem.updateCitizen(citizen.id, input.gameTime, {
      buildings: input.buildings,
      resources: input.resources,
      threatLevel: input.threatLevel,
      cityEvents: activeEventTypes
    });
  }

  return {
    citizens,
    communityMood: citizenSystem.getCommunityMood()
  };
}
