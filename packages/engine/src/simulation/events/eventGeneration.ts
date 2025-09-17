import type {
  ActiveEvent,
  EventDefinition,
  EventImpact,
  EventType,
  SystemState,
  VisualIndicator
} from './types';

export type RandomFn = () => number;

export type EventGenerationReason = 'probability' | 'trigger' | 'manual';

export interface EventCandidate {
  type: EventType;
  definition: EventDefinition;
  indicator: IndicatorPayload;
  reason: EventGenerationReason;
}

export type IndicatorPayload = Omit<VisualIndicator, 'id'>;

export function adjustEventProbability(
  eventType: EventType,
  baseProbability: number,
  state: SystemState
): number {
  let probability = baseProbability;

  switch (eventType) {
    case 'social_unrest':
      if (state.happiness < 40) probability *= 2;
      if (state.stability < 30) probability *= 1.5;
      break;
    case 'plague_outbreak':
      if (state.population > 50) probability *= 1.3;
      if (state.infrastructure < 40) probability *= 1.2;
      break;
    case 'economic_boom':
      if (state.economicHealth > 70) probability *= 1.5;
      break;
    case 'technological_breakthrough':
      if (state.resources > 60) probability *= 1.2;
      break;
    default:
      break;
  }

  return Math.min(probability, 1);
}

export function shouldActivateTrigger(condition: string, state: SystemState): boolean {
  switch (condition) {
    case 'low_infrastructure':
      return state.infrastructure < 40;
    case 'high_trade':
      return state.economicHealth > 70;
    case 'high_population_density':
      return state.population > 40;
    default:
      return false;
  }
}

export function computeEventImpactScore(impact: EventImpact): number {
  const resourceImpact = Object.values(impact.resources).reduce(
    (sum, value) => sum + Math.abs(value || 0),
    0
  );
  const moodImpact =
    Math.abs(impact.citizenMood.happiness) +
    Math.abs(impact.citizenMood.stress) +
    Math.abs(impact.citizenMood.motivation);
  const economicImpact = Math.abs((impact.economicEffects.growthRate || 0) * 2);

  return Math.min(100, resourceImpact / 10 + moodImpact + economicImpact);
}

export function buildEventIndicator(
  definition: EventDefinition,
  reason: EventGenerationReason
): IndicatorPayload {
  const priority =
    definition.severity === 'critical'
      ? 'critical'
      : definition.severity === 'major'
        ? 'high'
        : 'medium';

  return {
    type: 'event_impact',
    position: { x: 0, y: 0 },
    value: computeEventImpactScore(definition.impact),
    change: reason === 'trigger' ? 2 : 1,
    color: definition.color,
    icon: definition.type,
    animation: definition.animationType,
    duration: 5,
    priority
  };
}

export function generateEventCandidates({
  systemState,
  activeEvents,
  eventDefinitions,
  random = Math.random
}: {
  systemState: SystemState;
  activeEvents: Iterable<ActiveEvent>;
  eventDefinitions: Record<EventType, EventDefinition>;
  random?: RandomFn;
}): EventCandidate[] {
  const candidates: EventCandidate[] = [];

  for (const [eventType, definition] of Object.entries(eventDefinitions) as Array<[
    EventType,
    EventDefinition
  ]>) {
    const adjustedProbability = adjustEventProbability(
      eventType,
      definition.impact.probability,
      systemState
    );

    if (random() < adjustedProbability) {
      candidates.push({
        type: eventType,
        definition,
        reason: 'probability',
        indicator: buildEventIndicator(definition, 'probability')
      });
    }
  }

  for (const event of activeEvents) {
    if (!event.triggers) continue;

    for (const trigger of event.triggers) {
      if (!shouldActivateTrigger(trigger.condition, systemState)) continue;
      if (random() >= trigger.probability) continue;

      const definition = eventDefinitions[trigger.eventType];
      if (!definition) continue;

      candidates.push({
        type: trigger.eventType,
        definition,
        reason: 'trigger',
        indicator: buildEventIndicator(definition, 'trigger')
      });
    }
  }

  return candidates;
}
