// Job specializations and skill requirements
export interface JobRole {
  id: string;
  title: string;
  category: 'production' | 'service' | 'management' | 'research' | 'maintenance';
  requiredSkills: Record<string, number>; // skill name -> minimum level
  baseWage: number;
  maxLevel: number; // career progression levels
  responsibilities: string[];
  workload: number; // 0-100, affects stress and efficiency
  prestige: number; // 0-100, affects citizen satisfaction
}

// Worker specialization and career data
export interface WorkerProfile {
  citizenId: string;
  currentRole: JobRole;
  experienceLevel: number; // 0-100 within current role
  careerLevel: number; // 1-maxLevel for the role
  specializations: string[]; // areas of expertise
  certifications: string[]; // earned qualifications

  // Performance metrics
  efficiency: number; // 0-100, work output quality
  reliability: number; // 0-100, attendance and consistency
  teamwork: number; // 0-100, collaboration skills
  innovation: number; // 0-100, problem-solving and creativity

  // Work satisfaction
  jobSatisfaction: number; // 0-100
  workplaceRelationships: Array<{
    coworkerId: string;
    relationship: 'mentor' | 'peer' | 'subordinate' | 'rival';
    quality: number; // 0-100
  }>;

  // Career progression
  promotionReadiness: number; // 0-100
  trainingProgress: Record<string, number>; // skill -> progress
  careerGoals: {
    targetRole?: string;
    targetLevel: number;
    timeframe: number; // cycles to achieve
  };

  // Work schedule and conditions
  shiftType: 'day' | 'night' | 'rotating' | 'flexible';
  hoursPerWeek: number;
  overtimeHours: number;
  vacationDays: number;
  sickDays: number;

  // Compensation and benefits
  currentWage: number;
  bonuses: number;
  benefits: {
    healthcare: boolean;
    retirement: boolean;
    training: boolean;
    flexibleHours: boolean;
  };

  // Performance history
  performanceReviews: Array<{
    cycle: number;
    overallRating: number;
    strengths: string[];
    improvements: string[];
    wageAdjustment: number;
  }>;

  // Work-life balance
  burnoutRisk: number; // 0-100
  workLifeBalance: number; // 0-100
  stressLevel: number; // 0-100
}

// Workplace and team dynamics
export interface Workplace {
  buildingId: string;
  department: string;
  manager?: string; // worker ID
  workers: string[]; // worker IDs
  teamCohesion: number; // 0-100
  productivity: number; // 0-100
  morale: number; // 0-100

  // Work environment
  workingConditions: {
    safety: number; // 0-100
    comfort: number; // 0-100
    equipment: number; // 0-100
    resources: number; // 0-100
  };

  // Team events and culture
  cultureType: 'competitive' | 'collaborative' | 'innovative' | 'traditional';
  teamEvents: Array<{
    cycle: number;
    type: string;
    impact: number; // -100 to 100
    participants: string[];
  }>;
}

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
