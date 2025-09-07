import { CityMetrics } from './types';

export interface CityEvent {
  id: string;
  type: 'disaster' | 'economic' | 'social' | 'infrastructure';
  title: string;
  description: string;
  impact: Partial<CityMetrics>;
  duration: number;
  startTime: number;
}

export class EventManager {
  private events: CityEvent[] = [];

  constructor(private metrics: CityMetrics, private getGameTime: () => number) {}

  getEvents(): CityEvent[] {
    return [...this.events];
  }

  update(deltaTime: number): void {
    this.events = this.events.filter(event => {
      event.duration -= deltaTime;
      if (event.duration <= 0) {
        this.resolveEvent(event);
        return false;
      }
      return true;
    });
  }

  processRandomEvents(): void {
    if (Math.random() < 0.0001) {
      this.generateRandomEvent();
    }
  }

  private generateRandomEvent(): void {
    const eventTypes = [
      {
        type: 'economic' as const,
        title: 'Economic Boom',
        description: 'The city experiences economic growth',
        impact: { income: 20, happiness: 10 },
        duration: 60000
      },
      {
        type: 'social' as const,
        title: 'Festival',
        description: 'A city festival boosts happiness',
        impact: { happiness: 15, traffic: 10 },
        duration: 30000
      },
      {
        type: 'infrastructure' as const,
        title: 'Traffic Jam',
        description: 'Heavy traffic affects the city',
        impact: { traffic: 25, happiness: -5 },
        duration: 45000
      }
    ];

    const template = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const event: CityEvent = {
      id: `event_${Date.now()}`,
      ...template,
      startTime: this.getGameTime()
    };

    this.events.push(event);
    this.applyEventImpact(event);
  }

  private applyEventImpact(event: CityEvent): void {
    Object.entries(event.impact).forEach(([key, value]) => {
      const metricKey = key as keyof CityMetrics;
      const current = this.metrics[metricKey];
      this.metrics[metricKey] = Math.max(0, current + (value ?? 0));
    });
  }

  private resolveEvent(event: CityEvent): void {
    if (event.type === 'infrastructure' || event.type === 'social') {
      Object.entries(event.impact).forEach(([key, value]) => {
        const metricKey = key as keyof CityMetrics;
        const current = this.metrics[metricKey];
        this.metrics[metricKey] = Math.max(0, current - (value ?? 0));
      });
    }
  }
}
