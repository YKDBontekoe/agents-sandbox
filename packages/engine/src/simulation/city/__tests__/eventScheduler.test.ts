import { describe, expect, it } from 'vitest';
import { EventScheduler } from '../eventScheduler';
import type { CityEvent } from '../types';

describe('EventScheduler', () => {
  it('expires events and reverses social or infrastructure impacts', () => {
    const scheduler = new EventScheduler(() => 1); // No new events triggered
    const activeEvent: CityEvent = {
      id: 'event-1',
      type: 'social',
      title: 'Festival',
      description: 'Citizens celebrate',
      impact: { happiness: 15, traffic: 10 },
      duration: 1000,
      startTime: 0
    };

    const result = scheduler.advance({ events: [activeEvent], deltaTime: 2000, currentTime: 5000 });

    expect(result.events).toHaveLength(0);
    expect(result.resolvedEvents).toHaveLength(1);
    expect(result.metricDelta.happiness).toBe(-15);
    expect(result.metricDelta.traffic).toBe(-10);
  });

  it('generates random events when chance succeeds', () => {
    const scheduler = new EventScheduler(() => 0);

    const result = scheduler.advance({ events: [], deltaTime: 16, currentTime: 1000 });

    expect(result.events).toHaveLength(1);
    expect(result.triggeredEvents).toHaveLength(1);
    expect(result.metricDelta.income).toBe(20);
    expect(result.metricDelta.happiness).toBe(10);
  });
});
