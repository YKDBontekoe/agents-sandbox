import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameTime } from '../../../types/gameTime';
import { WeatherEffectsManager } from '../weatherEffectsManager';

afterEach(() => {
  vi.restoreAllMocks();
});

const springMorning: GameTime = {
  year: 1,
  month: 3,
  day: 10,
  hour: 9,
  minute: 0,
  totalMinutes: 9 * 60,
  timeOfDay: 'morning',
  dayProgress: 0.25,
  season: 'spring'
};

describe('WeatherEffectsManager', () => {
  it('removes weather effects after duration completes', () => {
    const manager = new WeatherEffectsManager();

    vi.spyOn(Math, 'random').mockReturnValue(0);

    manager.generate(springMorning);
    expect(manager.getEffects()).toHaveLength(1);

    manager.update(20000);
    expect(manager.getEffects()).toHaveLength(0);
  });

  it('respects weather chance thresholds before generating', () => {
    const manager = new WeatherEffectsManager();

    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    manager.generate(springMorning);
    expect(manager.getEffects()).toHaveLength(0);
  });
});
