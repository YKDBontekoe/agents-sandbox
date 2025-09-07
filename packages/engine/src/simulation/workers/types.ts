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

