import { describe, expect, it } from 'vitest';

import { createCitizen } from '../citizenFactory';
import { maybeTriggerLifeEvent } from '../lifeEvents';
import { createGameTime } from '../../../types/gameTime';

describe('Citizen life events', () => {
  it('applies promotion events and records history', () => {
    const citizen = createCitizen({ id: 'life-1', name: 'Aspiring', age: 32, seed: 7 });
    citizen.mood = {
      happiness: 80,
      stress: 40,
      energy: 70,
      motivation: 50
    };
    const randomValues = [0.1, 0.3];
    const random = () => {
      const value = randomValues.shift();
      return value === undefined ? 0 : value;
    };

    const result = maybeTriggerLifeEvent(citizen, createGameTime(120), {
      threatLevel: 10,
      random,
      eventChance: 0.5
    });

    expect(result).not.toBeNull();
    expect(result?.type).toBe('promotion');
    expect(citizen.income).toBeGreaterThan(0);
    expect(citizen.mood.happiness).toBeGreaterThan(80);
    expect(citizen.mood.motivation).toBeGreaterThan(50);
    expect(citizen.mood.stress).toBeGreaterThan(40);
    expect(citizen.lifeEvents.at(-1)?.type).toBe('promotion');
    expect(citizen.lifeEvents.at(-1)?.cycle).toBe(2);
  });

  it('respects event chance when below threshold', () => {
    const citizen = createCitizen({ id: 'life-2', name: 'Calm', age: 22, seed: 13 });
    const random = () => 0.9;

    const beforeMood = { ...citizen.mood };
    const beforeEvents = citizen.lifeEvents.length;

    const result = maybeTriggerLifeEvent(citizen, createGameTime(60), {
      threatLevel: 5,
      random,
      eventChance: 0.5
    });

    expect(result).toBeNull();
    expect(citizen.lifeEvents.length).toBe(beforeEvents);
    expect(citizen.mood).toEqual(beforeMood);
  });
});
