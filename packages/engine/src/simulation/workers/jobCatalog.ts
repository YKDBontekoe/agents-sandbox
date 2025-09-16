import type { JobRole } from './types';

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
    prestige: 40
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
    prestige: 35
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
    prestige: 55
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
    prestige: 60
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
    prestige: 50
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
    prestige: 75
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
    prestige: 80
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
    prestige: 70
  }
];

export function createDefaultJobCatalog(): Map<string, JobRole> {
  return new Map(DEFAULT_JOB_ROLES.map(role => [role.id, role]));
}

export { DEFAULT_JOB_ROLES };
