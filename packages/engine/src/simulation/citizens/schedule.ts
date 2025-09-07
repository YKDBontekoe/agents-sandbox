import { PersonalityTraits } from './types';

export interface DailySchedule {
  sleep: { start: number; end: number }; // hours 0-24
  work: { start: number; end: number };
  meals: Array<{ time: number; duration: number }>;
  leisure: Array<{ start: number; end: number; activity: string }>;
  social: Array<{ start: number; end: number; targetId?: string }>;
}

export interface LifeGoals {
  careerAspiration: string; // desired job type
  socialGoals: Array<{ type: string; target?: string; priority: number }>;
  materialGoals: Array<{ item: string; priority: number }>;
  personalGrowth: Array<{ skill: string; currentLevel: number; targetLevel: number }>;
}

export function generateDailySchedule(
  personality: PersonalityTraits,
  rng: () => number
): DailySchedule {
  const sleepStart = 22 + rng() * 2; // 22-24
  const sleepEnd = 6 + rng() * 2; // 6-8
  const workStart = 8 + rng() * 2; // 8-10
  const workEnd = 16 + rng() * 2; // 16-18

  return {
    sleep: { start: sleepStart, end: sleepEnd },
    work: { start: workStart, end: workEnd },
    meals: [
      { time: 7, duration: 1 },
      { time: 12, duration: 1 },
      { time: 19, duration: 1 }
    ],
    leisure: [
      { start: workEnd + 1, end: 19, activity: 'relaxing' },
      { start: 20, end: sleepStart, activity: 'entertainment' }
    ],
    social: personality.sociability > 0.6 ? [
      { start: 18, end: 20 }
    ] : []
  };
}

export function generateLifeGoals(
  personality: PersonalityTraits,
  age: number,
  rng: () => number
): LifeGoals {
  const careerAmbition = personality.ambition > 0.7 ? 'leadership' :
    personality.industriousness > 0.6 ? 'specialist' : 'stable_work';

  return {
    careerAspiration: careerAmbition,
    socialGoals: personality.sociability > 0.5 ? [
      { type: 'make_friends', priority: 70 },
      { type: 'find_romance', priority: age < 30 ? 80 : 40 }
    ] : [],
    materialGoals: [
      { item: 'better_housing', priority: 60 },
      { item: 'savings', priority: 50 }
    ],
    personalGrowth: [
      { skill: 'work_efficiency', currentLevel: 30, targetLevel: 70 }
    ]
  };
}
