// Shared GameTime interface for all simulation components
export interface GameTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  totalMinutes: number;
  timeOfDay: string;
  dayProgress: number;
  season: string;
}

// Time speed multipliers for gameplay
export const TIME_SPEEDS = {
  PAUSED: 0,
  NORMAL: 1,
  FAST: 2,
  VERY_FAST: 3,
  ULTRA_FAST: 4,
  HYPER_SPEED: 5
} as const;

export type TimeSpeed = typeof TIME_SPEEDS[keyof typeof TIME_SPEEDS];

// Helper function to create GameTime from total minutes
export function createGameTime(totalMinutes: number): GameTime {
  const year = Math.floor(totalMinutes / (365 * 24 * 60)) + 1;
  const remainingMinutes = totalMinutes % (365 * 24 * 60);
  const dayOfYear = Math.floor(remainingMinutes / (24 * 60));
  const month = Math.floor(dayOfYear / 30) + 1;
  const day = (dayOfYear % 30) + 1;
  const hour = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const minute = remainingMinutes % 60;
  
  const dayProgress = (hour * 60 + minute) / (24 * 60);
  
  let timeOfDay: string;
  if (hour >= 6 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18 && hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  let season: string;
  const seasonIndex = Math.floor((month - 1) / 3);
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  season = seasons[seasonIndex] || 'spring';
  
  return {
    year,
    month,
    day,
    hour,
    minute,
    totalMinutes,
    timeOfDay,
    dayProgress,
    season
  };
}