export interface WorkShift {
  startHour: number;
  endHour: number;
  workersNeeded: number;
  currentWorkers: string[];
}

export interface WorkerSpecialization {
  id: string;
  name: string;
  requiredSkills: Record<string, number>;
  efficiency: number;
  preferredBuildings: string[];
  trainingTime: number;
  prerequisites?: string[];
}

export const WORKER_SPECIALIZATIONS: WorkerSpecialization[] = [
  {
    id: 'farmer',
    name: 'Farmer',
    requiredSkills: { agriculture: 20, endurance: 15 },
    efficiency: 1.2,
    preferredBuildings: ['farm'],
    trainingTime: 20
  },
  {
    id: 'lumberjack',
    name: 'Lumberjack',
    requiredSkills: { forestry: 25, strength: 30 },
    efficiency: 1.3,
    preferredBuildings: ['lumber_camp'],
    trainingTime: 25
  },
  {
    id: 'carpenter',
    name: 'Carpenter',
    requiredSkills: { crafting: 35, precision: 25 },
    efficiency: 1.4,
    preferredBuildings: ['sawmill', 'house'],
    trainingTime: 40,
    prerequisites: ['lumberjack']
  },
  {
    id: 'foreman',
    name: 'Foreman',
    requiredSkills: { leadership: 40, organization: 35 },
    efficiency: 1.1,
    preferredBuildings: ['farm', 'lumber_camp', 'sawmill'],
    trainingTime: 60,
    prerequisites: ['farmer', 'lumberjack']
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    requiredSkills: { learning: 20 },
    efficiency: 0.7,
    preferredBuildings: ['farm', 'lumber_camp', 'sawmill'],
    trainingTime: 10
  },
  {
    id: 'specialist',
    name: 'Specialist',
    requiredSkills: { expertise: 50, innovation: 30 },
    efficiency: 1.6,
    preferredBuildings: ['sawmill'],
    trainingTime: 80,
    prerequisites: ['carpenter']
  }
];

export interface JobAssignment {
  id: string;
  buildingId: string;
  buildingType: string;
  position: { x: number; y: number };
  requiredWorkers: number;
  currentWorkers: string[];
  priority: number;
  skillRequirements: Record<string, number>;
  workConditions: {
    safety: number;
    comfort: number;
    socialInteraction: number;
    autonomy: number;
  };
  shifts: WorkShift[];
  productivity: number;
  lastUpdated: number;
}

export interface WorkerProfile {
  citizenId: string;
  specializations: string[];
  currentJob?: string;
  workHistory: Array<{
    jobId: string;
    buildingType: string;
    startCycle: number;
    endCycle?: number;
    performance: number;
    satisfaction: number;
  }>;
  preferences: {
    preferredShift: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
    maxCommute: number;
    workStyle: 'independent' | 'collaborative' | 'leadership' | 'support';
    riskTolerance: number;
  };
  performance: {
    reliability: number;
    efficiency: number;
    adaptability: number;
    teamwork: number;
  };
  availability: {
    currentShift?: { start: number; end: number };
    daysOff: number[];
    vacationDays: number;
    sickDays: number;
  };
  trainingProgress: Record<string, {
    specializationId: string;
    progress: number;
    trainer?: string;
    estimatedCompletion: number;
  }>;
}
