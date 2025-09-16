import { generateDailySchedule, generateLifeGoals } from './schedule';
import type { Citizen } from './citizen';
import type { CitizenMood, CitizenNeeds, PersonalityTraits } from './types';

export interface CitizenFactoryInput {
  id: string;
  name: string;
  age: number;
  seed: number;
  gender?: Citizen['gender'];
}

export function createCitizen(input: CitizenFactoryInput): Citizen {
  const rng = createSeededRandom(input.seed);

  const personality = generatePersonality(rng);
  const needs = generateInitialNeeds(rng);
  const mood = generateInitialMood(rng);
  const schedule = generateDailySchedule(personality, rng);
  const goals = generateLifeGoals(personality, input.age, rng);
  const gender = input.gender ?? (rng() < 0.5 ? 'male' : 'female');

  return {
    id: input.id,
    name: input.name,
    age: input.age,
    gender,
    personality,
    needs,
    mood,
    jobTitle: 'Unemployed',
    skills: generateSkills(personality, input.age, rng),
    relationships: [],
    familyMembers: [],
    schedule,
    goals,
    currentActivity: 'idle',
    location: { x: 0, y: 0 },
    lastActivityChange: 0,
    wealth: 10 + rng() * 40,
    income: 0,
    expenses: 5 + rng() * 10,
    lifeEvents: []
  };
}

function generatePersonality(rng: () => number): PersonalityTraits {
  return {
    ambition: rng(),
    sociability: rng(),
    industriousness: rng(),
    contentment: rng(),
    curiosity: rng()
  };
}

function generateInitialNeeds(rng: () => number): CitizenNeeds {
  return {
    food: 80 + rng() * 20,
    shelter: 70 + rng() * 30,
    social: 60 + rng() * 40,
    purpose: 50 + rng() * 50,
    safety: 75 + rng() * 25
  };
}

function generateInitialMood(rng: () => number): CitizenMood {
  return {
    happiness: 60 + rng() * 30,
    stress: 20 + rng() * 30,
    energy: 70 + rng() * 30,
    motivation: 60 + rng() * 40
  };
}

function generateSkills(
  personality: PersonalityTraits,
  age: number,
  rng: () => number
): Record<string, number> {
  const baseSkill = Math.min(80, age * 2 + rng() * 20);

  return {
    work_efficiency: baseSkill * personality.industriousness,
    social_skills: baseSkill * personality.sociability,
    leadership: baseSkill * personality.ambition,
    creativity: baseSkill * personality.curiosity,
    resilience: baseSkill * personality.contentment
  };
}

export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
