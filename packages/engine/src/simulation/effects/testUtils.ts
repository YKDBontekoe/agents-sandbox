import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings';
import type { Citizen } from '../citizens/citizen';
import type { VisualEffectsGameState } from './types';
import type { WorkerProfile, JobRole } from '../workers/types';

export function createMockBuilding(overrides: Partial<SimulatedBuilding> = {}): SimulatedBuilding {
  const base: SimulatedBuilding = {
    id: 'building-1',
    typeId: 'house',
    x: 10,
    y: 10,
    level: 1,
    workers: 5,
    condition: 'good',
    lastMaintenance: 0,
    maintenanceDebt: 0,
    utilityEfficiency: 0.85,
    traits: {}
  };

  return { ...base, ...overrides };
}

export function createMockResources(overrides: Partial<SimResources> = {}): SimResources {
  const base: SimResources = {
    grain: 100,
    coin: 100,
    mana: 50,
    favor: 10,
    workers: 50,
    wood: 80,
    planks: 40
  };

  return { ...base, ...overrides };
}

function createMockJobRole(overrides: Partial<JobRole> = {}): JobRole {
  const base: JobRole = {
    id: 'laborer',
    title: 'Laborer',
    category: 'production',
    requiredSkills: {},
    baseWage: 10,
    maxLevel: 3,
    responsibilities: ['General labor'],
    workload: 40,
    prestige: 20
  };

  return { ...base, ...overrides };
}

export function createMockWorker(overrides: Partial<WorkerProfile> = {}): WorkerProfile {
  const base: WorkerProfile = {
    citizenId: 'citizen-1',
    currentRole: createMockJobRole(),
    experienceLevel: 10,
    careerLevel: 1,
    specializations: [],
    certifications: [],
    efficiency: 70,
    reliability: 65,
    teamwork: 60,
    innovation: 55,
    jobSatisfaction: 60,
    workplaceRelationships: [],
    promotionReadiness: 15,
    trainingProgress: {},
    careerGoals: {
      targetLevel: 2,
      timeframe: 12
    },
    shiftType: 'day',
    hoursPerWeek: 40,
    overtimeHours: 5,
    vacationDays: 10,
    sickDays: 2,
    currentWage: 15,
    bonuses: 0,
    benefits: {
      healthcare: true,
      retirement: false,
      training: true,
      flexibleHours: false
    },
    performanceReviews: [],
    burnoutRisk: 20,
    workLifeBalance: 65,
    stressLevel: 35
  };

  return { ...base, ...overrides };
}

export function createMockCitizen(overrides: Partial<Citizen> = {}): Citizen {
  const base: Citizen = {
    id: 'citizen-1',
    name: 'Aerin',
    age: 28,
    gender: 'other',
    personality: {
      ambition: 0.6,
      sociability: 0.5,
      industriousness: 0.7,
      contentment: 0.5,
      curiosity: 0.4
    },
    needs: {
      food: 60,
      shelter: 70,
      social: 50,
      purpose: 55,
      safety: 65
    },
    mood: {
      happiness: 65,
      stress: 30,
      energy: 70,
      motivation: 60
    },
    homeId: 'home-1',
    workId: 'building-1',
    jobTitle: 'Laborer',
    skills: {},
    relationships: [],
    familyMembers: [],
    schedule: {
      sleep: { start: 22, end: 6 },
      work: { start: 9, end: 17 },
      meals: [
        { time: 7, duration: 1 },
        { time: 12, duration: 1 },
        { time: 19, duration: 1 }
      ],
      leisure: [{ start: 18, end: 20, activity: 'relaxing' }],
      social: []
    },
    goals: {
      careerAspiration: 'stable_work',
      socialGoals: [],
      materialGoals: [],
      personalGrowth: []
    },
    currentActivity: 'working',
    location: { x: 15, y: 15 },
    lastActivityChange: 0,
    wealth: 200,
    income: 15,
    expenses: 8,
    lifeEvents: []
  };

  return { ...base, ...overrides };
}

export function createMockGameState(overrides: Partial<VisualEffectsGameState> = {}): VisualEffectsGameState {
  const base: VisualEffectsGameState = {
    buildings: [createMockBuilding()],
    citizens: [createMockCitizen()],
    workers: [createMockWorker()],
    resources: createMockResources()
  };

  return { ...base, ...overrides };
}
