import type { GameTime } from '../../types/gameTime';
import type { Citizen } from './citizen';
import {
  maybeTriggerLifeEvent,
  type LifeEventTriggerContext,
  type TriggeredLifeEvent,
} from './lifeEvents';

export interface LifeEventEvaluationContext extends Omit<LifeEventTriggerContext, 'eventChance'> {
  eventChance?: number;
}

export class LifeEventScheduler {
  constructor(private readonly defaultEventChance = 0.02) {}

  evaluateCitizen(
    citizen: Citizen,
    gameTime: GameTime,
    context: LifeEventEvaluationContext,
  ): TriggeredLifeEvent | null {
    const evaluationContext: LifeEventTriggerContext = {
      ...context,
      eventChance: context.eventChance ?? this.defaultEventChance,
    };

    return maybeTriggerLifeEvent(citizen, gameTime, evaluationContext);
  }
}
