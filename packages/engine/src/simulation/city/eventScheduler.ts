import type { CityEvent, CityMetricDelta } from './types';

export interface EventAdvanceArgs {
  events: ReadonlyArray<CityEvent>;
  deltaTime: number;
  currentTime: number;
}

export interface EventAdvanceResult {
  events: CityEvent[];
  metricDelta: CityMetricDelta;
  triggeredEvents: CityEvent[];
  resolvedEvents: CityEvent[];
}

type RandomFn = () => number;

export class EventScheduler {
  private readonly randomEventChance = 0.0001;

  constructor(private readonly random: RandomFn = Math.random) {}

  advance(args: EventAdvanceArgs): EventAdvanceResult {
    const { events, deltaTime, currentTime } = args;
    const activeEvents: CityEvent[] = [];
    const metricDelta: CityMetricDelta = {};
    const resolvedEvents: CityEvent[] = [];

    for (const event of events) {
      const remainingDuration = event.duration - deltaTime;
      if (remainingDuration <= 0) {
        resolvedEvents.push(event);
        if (event.type === 'infrastructure' || event.type === 'social') {
          this.applyImpact(metricDelta, event, -1);
        }
        continue;
      }

      activeEvents.push({ ...event, duration: remainingDuration });
    }

    let triggeredEvents: CityEvent[] = [];
    if (this.random() < this.randomEventChance) {
      const newEvent = this.generateRandomEvent(currentTime);
      triggeredEvents = [newEvent];
      activeEvents.push(newEvent);
      this.applyImpact(metricDelta, newEvent, 1);
    }

    return {
      events: activeEvents,
      metricDelta,
      triggeredEvents,
      resolvedEvents
    };
  }

  private applyImpact(delta: CityMetricDelta, event: CityEvent, multiplier: number): void {
    Object.entries(event.impact).forEach(([key, value]) => {
      if (typeof value === 'number') {
        const current = delta[key as keyof CityMetricDelta] ?? 0;
        delta[key as keyof CityMetricDelta] = current + value * multiplier;
      }
    });
  }

  private generateRandomEvent(currentTime: number): CityEvent {
    const templates: Array<Omit<CityEvent, 'id' | 'startTime'>> = [
      {
        type: 'economic',
        title: 'Economic Boom',
        description: 'The city experiences economic growth',
        impact: { income: 20, happiness: 10 },
        duration: 60000
      },
      {
        type: 'social',
        title: 'Festival',
        description: 'A city festival boosts happiness',
        impact: { happiness: 15, traffic: 10 },
        duration: 30000
      },
      {
        type: 'infrastructure',
        title: 'Traffic Jam',
        description: 'Heavy traffic affects the city',
        impact: { traffic: 25, happiness: -5 },
        duration: 45000
      }
    ];

    const index = Math.floor(this.random() * templates.length);
    const template = templates[index] ?? templates[0];

    return {
      id: `event_${Date.now()}`,
      ...template,
      startTime: currentTime
    };
  }
}
