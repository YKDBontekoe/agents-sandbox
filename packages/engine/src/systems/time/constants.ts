import { TIME_SPEEDS } from '../../types/gameTime';
import type { TimeSpeed } from '../../types/gameTime';

// Time of day phases
export enum TimeOfDay {
  DAWN = 'dawn',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
  LATE_NIGHT = 'late_night'
}

// Real seconds required per in-game minute for each speed
export const SPEED_MULTIPLIERS: Record<TimeSpeed, number> = {
  [TIME_SPEEDS.PAUSED]: 0,
  [TIME_SPEEDS.NORMAL]: 0.1,       // 0.1 real seconds = 1 game minute (10x speed)
  [TIME_SPEEDS.FAST]: 0.05,        // 0.05 real seconds = 1 game minute (20x speed)
  [TIME_SPEEDS.VERY_FAST]: 0.025,  // 0.025 real seconds = 1 game minute (40x speed)
  [TIME_SPEEDS.ULTRA_FAST]: 0.0125, // 0.0125 real seconds = 1 game minute (80x speed)
  [TIME_SPEEDS.HYPER_SPEED]: 0.005  // 0.005 real seconds = 1 game minute (200x speed)
};
