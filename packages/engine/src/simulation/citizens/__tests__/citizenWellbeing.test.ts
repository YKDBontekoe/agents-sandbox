import { describe, expect, it } from 'vitest';

import { createCitizen } from '../citizenFactory';
import { updateMood, updateNeeds } from '../citizenWellbeing';
import { createGameTime } from '../../../types/gameTime';

describe('CitizenWellbeing', () => {
  it('decays core needs while clamping to valid ranges', () => {
    const citizen = createCitizen({ id: 'c1', name: 'Test Citizen', age: 30, seed: 42 });

    citizen.personality.contentment = 0;
    citizen.needs = {
      food: 5,
      shelter: 3,
      social: 2,
      purpose: 1,
      safety: 100
    };

    updateNeeds(citizen, createGameTime(0));

    expect(citizen.needs.food).toBeCloseTo(3, 5);
    expect(citizen.needs.shelter).toBeCloseTo(2.5, 5);
    expect(citizen.needs.social).toBeCloseTo(0.5, 5);
    expect(citizen.needs.purpose).toBeGreaterThanOrEqual(0);
    expect(citizen.needs.purpose).toBeLessThan(1);
  });

  it('balances mood using needs satisfaction and city threat', () => {
    const citizen = createCitizen({ id: 'c2', name: 'Balanced Citizen', age: 28, seed: 99 });

    citizen.personality.contentment = 0.5;
    citizen.personality.ambition = 0.8;
    citizen.needs = {
      food: 90,
      shelter: 85,
      social: 70,
      purpose: 65,
      safety: 80
    };
    citizen.mood = {
      happiness: 50,
      stress: 50,
      energy: 50,
      motivation: 50
    };

    updateMood(citizen, { threatLevel: 20, cityEvents: [] });

    expect(citizen.mood.happiness).toBeCloseTo(51.63, 2);
    expect(citizen.mood.stress).toBeCloseTo(44.6, 1);
    expect(citizen.mood.energy).toBeCloseTo(57.32, 2);
    expect(citizen.mood.motivation).toBeCloseTo(52.1, 1);
  });
});
