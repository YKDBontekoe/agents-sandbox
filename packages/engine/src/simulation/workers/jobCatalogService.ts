import type { Citizen } from '../citizens/citizen';
import type { JobRole } from './types';

export interface QualificationGap {
  skill: string;
  required: number;
  actual: number;
}

export interface QualificationResult {
  role?: JobRole;
  qualified: boolean;
  missingSkills: QualificationGap[];
}

const DEFAULT_JOB_ROLES: JobRole[] = [
  {
    id: 'farmer',
    title: 'Farmer',
    category: 'production',
    requiredSkills: { agriculture: 20, physical_strength: 30 },
    baseWage: 15,
    maxLevel: 5,
    responsibilities: ['Crop cultivation', 'Livestock care', 'Equipment maintenance'],
    workload: 70,
    prestige: 40,
  },
  {
    id: 'miner',
    title: 'Miner',
    category: 'production',
    requiredSkills: { mining: 25, physical_strength: 40 },
    baseWage: 20,
    maxLevel: 4,
    responsibilities: ['Resource extraction', 'Safety protocols', 'Equipment operation'],
    workload: 80,
    prestige: 35,
  },
  {
    id: 'craftsman',
    title: 'Craftsman',
    category: 'production',
    requiredSkills: { crafting: 30, creativity: 25 },
    baseWage: 18,
    maxLevel: 6,
    responsibilities: ['Item creation', 'Quality control', 'Design innovation'],
    workload: 60,
    prestige: 55,
  },
  {
    id: 'merchant',
    title: 'Merchant',
    category: 'service',
    requiredSkills: { negotiation: 35, social_skills: 40 },
    baseWage: 25,
    maxLevel: 5,
    responsibilities: ['Trade management', 'Customer relations', 'Market analysis'],
    workload: 65,
    prestige: 60,
  },
  {
    id: 'guard',
    title: 'Guard',
    category: 'service',
    requiredSkills: { combat: 40, vigilance: 35 },
    baseWage: 22,
    maxLevel: 4,
    responsibilities: ['Security patrol', 'Threat assessment', 'Emergency response'],
    workload: 75,
    prestige: 50,
  },
  {
    id: 'supervisor',
    title: 'Supervisor',
    category: 'management',
    requiredSkills: { leadership: 50, organization: 45 },
    baseWage: 35,
    maxLevel: 4,
    responsibilities: ['Team coordination', 'Performance management', 'Resource allocation'],
    workload: 85,
    prestige: 75,
  },
  {
    id: 'researcher',
    title: 'Researcher',
    category: 'research',
    requiredSkills: { intelligence: 60, curiosity: 50 },
    baseWage: 30,
    maxLevel: 6,
    responsibilities: ['Knowledge discovery', 'Innovation development', 'Documentation'],
    workload: 70,
    prestige: 80,
  },
  {
    id: 'engineer',
    title: 'Engineer',
    category: 'maintenance',
    requiredSkills: { engineering: 45, problem_solving: 40 },
    baseWage: 28,
    maxLevel: 5,
    responsibilities: ['System maintenance', 'Efficiency optimization', 'Technical support'],
    workload: 75,
    prestige: 70,
  },
];

function normalizeRoles(roles: Iterable<JobRole> | Map<string, JobRole>): Map<string, JobRole> {
  if (roles instanceof Map) {
    return new Map(roles);
  }

  return new Map(Array.from(roles, (role) => [role.id, role]));
}

export class JobCatalogService {
  private roles: Map<string, JobRole>;

  constructor(roles: Iterable<JobRole> | Map<string, JobRole> = DEFAULT_JOB_ROLES) {
    this.roles = normalizeRoles(roles);
  }

  getRole(roleId: string): JobRole | undefined {
    return this.roles.get(roleId);
  }

  hasRole(roleId: string): boolean {
    return this.roles.has(roleId);
  }

  listRoles(): JobRole[] {
    return Array.from(this.roles.values());
  }

  getRolesMap(): Map<string, JobRole> {
    return new Map(this.roles);
  }

  upsertRole(role: JobRole): void {
    this.roles.set(role.id, role);
  }

  removeRole(roleId: string): boolean {
    return this.roles.delete(roleId);
  }

  evaluateCitizenForRole(citizen: Citizen, roleOrId: string | JobRole): QualificationResult {
    const role = typeof roleOrId === 'string' ? this.getRole(roleOrId) : roleOrId;

    if (!role) {
      return { role: undefined, qualified: false, missingSkills: [] };
    }

    const missingSkills: QualificationGap[] = [];
    for (const [skill, required] of Object.entries(role.requiredSkills)) {
      const actual = citizen.skills?.[skill] ?? 0;
      if (actual < required) {
        missingSkills.push({ skill, required, actual });
      }
    }

    return {
      role,
      qualified: missingSkills.length === 0,
      missingSkills,
    };
  }

  isCitizenQualified(citizen: Citizen, roleOrId: string | JobRole): boolean {
    return this.evaluateCitizenForRole(citizen, roleOrId).qualified;
  }
}

export function createDefaultJobCatalog(): Map<string, JobRole> {
  return new Map(DEFAULT_JOB_ROLES.map((role) => [role.id, role]));
}

export { DEFAULT_JOB_ROLES };
