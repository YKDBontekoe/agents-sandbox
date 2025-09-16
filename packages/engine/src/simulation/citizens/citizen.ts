import type { DailySchedule, LifeGoals } from './schedule';
import type {
  CitizenMood,
  CitizenNeeds,
  PersonalityTraits,
  SocialRelationship
} from './types';

export interface Citizen {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';

  // Core attributes
  personality: PersonalityTraits;
  needs: CitizenNeeds;
  mood: CitizenMood;

  // Life situation
  homeId?: string;
  workId?: string;
  jobTitle: string;
  skills: Record<string, number>;

  // Social connections
  relationships: SocialRelationship[];
  familyMembers: string[];

  // Behavior patterns
  schedule: DailySchedule;
  goals: LifeGoals;

  // State tracking
  currentActivity: string;
  location: { x: number; y: number };
  lastActivityChange: number;

  // Economic status
  wealth: number;
  income: number;
  expenses: number;

  // Life events and history
  lifeEvents: Array<{
    cycle: number;
    type: string;
    description: string;
    impact: Partial<CitizenMood>;
  }>;
}
