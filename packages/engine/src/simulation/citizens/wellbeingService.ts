import type { Citizen } from './citizen';
import { updateMood, updateNeeds, type MoodUpdateContext } from './citizenWellbeing';

export class WellbeingService {
  applyNeedsDecay(citizen: Citizen): void {
    updateNeeds(citizen);
  }

  updateCitizenMood(citizen: Citizen, context: MoodUpdateContext): void {
    updateMood(citizen, context);
  }
}

export type { MoodUpdateContext };
