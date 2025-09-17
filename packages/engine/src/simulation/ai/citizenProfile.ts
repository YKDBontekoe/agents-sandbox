import type { Citizen } from '../citizens/citizen';

export type WorkStyle = 'efficient' | 'social' | 'creative' | 'methodical';

export interface CitizenPreferences {
  workStyle: WorkStyle;
  socialTendency: number;
  explorationDrive: number;
  routinePreference: number;
}

export interface AdaptiveSchedule {
  workHours: { start: number; end: number; flexibility: number };
  socialHours: { start: number; end: number; flexibility: number };
  restHours: { start: number; end: number; flexibility: number };
  personalTime: { start: number; end: number; flexibility: number };
}

export interface CitizenProfile {
  readonly citizenId: string;
  readonly preferences: Readonly<CitizenPreferences>;
  readonly adaptiveSchedule: Readonly<AdaptiveSchedule>;
}

export type RandomSource = () => number;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const freezeProfile = (profile: CitizenProfile): CitizenProfile => {
  Object.freeze(profile.preferences);
  Object.freeze(profile.adaptiveSchedule.workHours);
  Object.freeze(profile.adaptiveSchedule.socialHours);
  Object.freeze(profile.adaptiveSchedule.restHours);
  Object.freeze(profile.adaptiveSchedule.personalTime);
  Object.freeze(profile.adaptiveSchedule);
  return Object.freeze(profile);
};

export const determineWorkStyle = (citizen: Citizen): WorkStyle => {
  const { industriousness, sociability, curiosity, contentment } = citizen.personality;

  if (sociability > 0.7) return 'social';
  if (curiosity > 0.7) return 'creative';
  if (industriousness > 0.7) return 'efficient';
  if (contentment > 0.7) return 'methodical';

  return 'efficient';
};

const jitter = (base: number, range: number, rng: RandomSource): number => {
  return base + (rng() - 0.5) * range * 2;
};

export const generateAdaptiveSchedule = (citizen: Citizen, rng: RandomSource): AdaptiveSchedule => {
  const baseFlexibility = citizen.personality.curiosity * 2;

  return {
    workHours: {
      start: jitter(7, 1, rng),
      end: jitter(16, 1, rng),
      flexibility: baseFlexibility
    },
    socialHours: {
      start: jitter(18, 1, rng),
      end: jitter(21, 1, rng),
      flexibility: baseFlexibility * 1.5
    },
    restHours: {
      start: jitter(22, 1, rng),
      end: jitter(6, 1, rng),
      flexibility: baseFlexibility * 0.5
    },
    personalTime: {
      start: jitter(16, 1, rng),
      end: jitter(18, 1, rng),
      flexibility: baseFlexibility * 2
    }
  };
};

export const createCitizenProfile = (
  citizen: Citizen,
  rng: RandomSource = Math.random
): CitizenProfile => {
  const preferences: CitizenPreferences = {
    workStyle: determineWorkStyle(citizen),
    socialTendency: clamp(30 + citizen.personality.sociability * 50, 0, 100),
    explorationDrive: clamp(20 + citizen.personality.curiosity * 60, 0, 100),
    routinePreference: clamp(40 + citizen.personality.contentment * 40, 0, 100)
  };

  const adaptiveSchedule = generateAdaptiveSchedule(citizen, rng);

  return freezeProfile({
    citizenId: citizen.id,
    preferences,
    adaptiveSchedule
  });
};

export const adjustPreferenceMetric = (
  profile: CitizenProfile,
  key: keyof Pick<CitizenPreferences, 'socialTendency' | 'explorationDrive' | 'routinePreference'>,
  delta: number
): CitizenProfile => {
  const current = profile.preferences[key];
  const updated = clamp(current + delta, 0, 100);

  if (updated === current) {
    return profile;
  }

  return freezeProfile({
    citizenId: profile.citizenId,
    preferences: {
      ...profile.preferences,
      [key]: updated
    },
    adaptiveSchedule: profile.adaptiveSchedule
  });
};
