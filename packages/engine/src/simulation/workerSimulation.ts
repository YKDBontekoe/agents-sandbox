import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizens/citizen';
import { workerSystem } from './workerSystem';
import type {
  JobAssignment,
  WorkerProfile as SystemWorkerProfile,
  JobRole,
  WorkerProfile,
} from './workers/types';
import type { GameTime } from '../types/gameTime';
import {
  calculateWageAdjustment,
  checkCareerProgression,
} from './workers/career';

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

// Labor market dynamics
export interface LaborMarket {
  jobOpenings: Array<{
    roleId: string;
    buildingId: string;
    urgency: number; // 0-100
    wageOffer: number;
    requirements: Record<string, number>;
    benefits: string[];
  }>;
  
  unemploymentRate: number;
  averageWages: Record<string, number>; // role category -> average wage
  skillDemand: Record<string, number>; // skill -> demand level (0-100)
  
  // Economic factors
  economicConditions: {
    growth: number; // -100 to 100
    inflation: number; // 0-100
    competitiveness: number; // 0-100
  };
  
  // Training and education availability
  trainingPrograms: Array<{
    id: string;
    skill: string;
    duration: number; // cycles
    cost: number;
    effectiveness: number; // 0-100
    availability: number; // slots available
  }>;
}

// Worker simulation system
export class WorkerSimulationSystem {
  private workers: Map<string, WorkerProfile> = new Map();
  private jobRoles: Map<string, JobRole> = new Map();
  private workplaces: Map<string, Workplace> = new Map();
  private laborMarket: LaborMarket;
  private currentCycle: number = 0;
  
  constructor() {
    this.initializeJobRoles();
    this.laborMarket = this.initializeLaborMarket();
  }

  // Initialize available job roles
  private initializeJobRoles(): void {
    const roles: JobRole[] = [
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

    roles.forEach(role => this.jobRoles.set(role.id, role));
  }

  // Initialize labor market
  private initializeLaborMarket(): LaborMarket {
    return {
      jobOpenings: [],
      unemploymentRate: 5,
      averageWages: {
        production: 18,
        service: 23,
        management: 35,
        research: 30,
        maintenance: 28
      },
      skillDemand: {
        agriculture: 60,
        mining: 70,
        crafting: 50,
        social_skills: 45,
        leadership: 30,
        intelligence: 40
      },
      economicConditions: {
        growth: 10,
        inflation: 3,
        competitiveness: 60
      },
      trainingPrograms: [
        {
          id: 'basic_skills',
          skill: 'work_efficiency',
          duration: 5,
          cost: 10,
          effectiveness: 70,
          availability: 20
        },
        {
          id: 'leadership_training',
          skill: 'leadership',
          duration: 10,
          cost: 25,
          effectiveness: 80,
          availability: 5
        }
      ]
    };
  }

  // Create worker profile for a citizen
  createWorker(citizen: Citizen, roleId: string): WorkerProfile | null {
    const role = this.jobRoles.get(roleId);
    if (!role) return null;

    // Initialize enhanced worker profile
    workerSystem.initializeWorker(citizen);

    // Check if citizen meets minimum requirements
    for (const [skill, minLevel] of Object.entries(role.requiredSkills)) {
      if ((citizen.skills[skill] || 0) < minLevel) {
        return null; // Not qualified
      }
    }

    const worker: WorkerProfile = {
      citizenId: citizen.id,
      currentRole: role,
      experienceLevel: 0,
      careerLevel: 1,
      specializations: [],
      certifications: [],
      
      efficiency: 50 + citizen.personality.industriousness * 30,
      reliability: 60 + citizen.personality.contentment * 25,
      teamwork: 40 + citizen.personality.sociability * 40,
      innovation: 30 + citizen.personality.curiosity * 50,
      
      jobSatisfaction: 70,
      workplaceRelationships: [],
      
      promotionReadiness: 0,
      trainingProgress: {},
      careerGoals: {
        targetLevel: Math.min(role.maxLevel, 2),
        timeframe: 50
      },
      
      shiftType: 'day',
      hoursPerWeek: 40,
      overtimeHours: 0,
      vacationDays: 10,
      sickDays: 5,
      
      currentWage: role.baseWage,
      bonuses: 0,
      benefits: {
        healthcare: false,
        retirement: false,
        training: false,
        flexibleHours: false
      },
      
      performanceReviews: [],
      
      burnoutRisk: 20,
      workLifeBalance: 70,
      stressLevel: 30
    };

    this.workers.set(citizen.id, worker);
    return worker;
  }

  // Update worker using GameTime
  updateWorker(workerId: string, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    citizens: Citizen[];
  }): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    // Convert GameTime to cycle for backward compatibility
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    this.currentCycle = currentCycle;
    
    // Update enhanced worker system
    workerSystem.updateWorkerPerformance(workerId, currentCycle);
    
    // Update experience and skills
    this.updateExperience(worker);
    
    // Update performance metrics
    this.updatePerformance(worker);
    
    // Update job satisfaction
    this.updateJobSatisfaction(worker, gameState);
    
    // Check for career progression
    checkCareerProgression(worker, gameTime, this.jobRoles);
    
    // Update work-life balance
    this.updateWorkLifeBalance(worker);
    
    // Handle workplace interactions
    this.handleWorkplaceInteractions(worker);
  }

  // Update worker experience and skill development
  private updateExperience(worker: WorkerProfile): void {
    const baseGain = 1;
    const efficiencyBonus = worker.efficiency / 100;
    const experienceGain = baseGain * (1 + efficiencyBonus);
    
    worker.experienceLevel = Math.min(100, worker.experienceLevel + experienceGain);
    
    // Skill improvement through work
    for (const skill of Object.keys(worker.currentRole.requiredSkills)) {
      const currentLevel = worker.trainingProgress[skill] || 0;
      const improvement = experienceGain * 0.5;
      worker.trainingProgress[skill] = Math.min(100, currentLevel + improvement);
    }
  }

  // Update performance metrics
  private updatePerformance(worker: WorkerProfile): void {
    // Efficiency affected by experience, tools, and conditions
    const experienceBonus = worker.experienceLevel * 0.2;
    const stressPenalty = worker.stressLevel * 0.3;
    const targetEfficiency = Math.max(20, Math.min(100, 50 + experienceBonus - stressPenalty));
    worker.efficiency = this.lerp(worker.efficiency, targetEfficiency, 0.1);
    
    // Reliability affected by job satisfaction and personal traits
    const satisfactionBonus = worker.jobSatisfaction * 0.3;
    const targetReliability = Math.max(30, Math.min(100, 60 + satisfactionBonus));
    worker.reliability = this.lerp(worker.reliability, targetReliability, 0.05);
    
    // Innovation affected by role requirements and personal curiosity
    if (worker.currentRole.category === 'research') {
      worker.innovation = Math.min(100, worker.innovation + 0.5);
    }
  }

  // Update job satisfaction
  private updateJobSatisfaction(worker: WorkerProfile, gameState: {
    citizens: Citizen[];
  }): void {
    const citizen = gameState.citizens.find(c => c.id === worker.citizenId);
    if (!citizen) return;

    let satisfaction = worker.jobSatisfaction;
    
    // Wage satisfaction
    const marketWage = this.laborMarket.averageWages[worker.currentRole.category];
    satisfaction += calculateWageAdjustment(worker, marketWage);
    
    // Work-life balance impact
    if (worker.workLifeBalance < 40) {
      satisfaction -= 3;
    } else if (worker.workLifeBalance > 70) {
      satisfaction += 1;
    }
    
    // Career progression satisfaction
    if (worker.promotionReadiness > 80 && worker.careerLevel < worker.currentRole.maxLevel) {
      satisfaction -= 1; // Frustrated by lack of promotion
    }
    
    // Role prestige alignment with personality
    const prestigeAlignment = worker.currentRole.prestige / 100;
    const ambitionAlignment = citizen.personality.ambition;
    if (Math.abs(prestigeAlignment - ambitionAlignment) > 0.3) {
      satisfaction -= 1;
    }
    
    worker.jobSatisfaction = Math.max(0, Math.min(100, satisfaction));
  }


  // Update work-life balance
  private updateWorkLifeBalance(worker: WorkerProfile): void {
    const totalHours = worker.hoursPerWeek + worker.overtimeHours;
    const workloadStress = worker.currentRole.workload;
    
    // Calculate work pressure
    const workPressure = (totalHours - 40) * 2 + workloadStress;
    
    // Update balance
    const targetBalance = Math.max(20, 100 - workPressure);
    worker.workLifeBalance = this.lerp(worker.workLifeBalance, targetBalance, 0.1);
    
    // Update stress and burnout risk
    worker.stressLevel = Math.min(100, workPressure * 0.8);
    worker.burnoutRisk = Math.max(0, worker.stressLevel - worker.workLifeBalance);
  }

  // Handle workplace social interactions
  private handleWorkplaceInteractions(worker: WorkerProfile): void {
    // Find workplace
    const workplace = Array.from(this.workplaces.values())
      .find(w => w.workers.includes(worker.citizenId));
    
    if (!workplace) return;
    
    // Random workplace interaction
    if (Math.random() < 0.1) { // 10% chance per cycle
      const coworkers = workplace.workers.filter(id => id !== worker.citizenId);
      if (coworkers.length > 0) {
        const coworkerId = coworkers[Math.floor(Math.random() * coworkers.length)];
        this.processWorkplaceInteraction(worker, coworkerId, workplace);
      }
    }
  }

  // Process interaction between coworkers
  private processWorkplaceInteraction(worker: WorkerProfile, coworkerId: string, workplace: Workplace): void {
    const coworker = this.workers.get(coworkerId);
    if (!coworker) return;
    
    // Find or create relationship
    let relationship = worker.workplaceRelationships.find(r => r.coworkerId === coworkerId);
    if (!relationship) {
      relationship = {
        coworkerId,
        relationship: 'peer',
        quality: 50
      };
      worker.workplaceRelationships.push(relationship);
    }
    
    // Interaction outcome based on teamwork skills
    const interactionSuccess = (worker.teamwork + coworker.teamwork) / 2;
    const qualityChange = interactionSuccess > 60 ? 2 : interactionSuccess < 40 ? -1 : 0;
    
    relationship.quality = Math.max(0, Math.min(100, relationship.quality + qualityChange));
    
    // Impact on workplace morale
    if (qualityChange > 0) {
      workplace.morale = Math.min(100, workplace.morale + 0.5);
      workplace.teamCohesion = Math.min(100, workplace.teamCohesion + 0.3);
    }
  }

  // Update labor market conditions
  updateLaborMarket(gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    economicGrowth: number;
  }): void {
    // Update economic conditions
    this.laborMarket.economicConditions.growth = gameState.economicGrowth;
    
    // Update skill demand based on building needs
    const skillDemand: Record<string, number> = {};
    for (const building of gameState.buildings) {
      // Increase demand for skills needed by active buildings
      const isOperational = building.workers > 0 && building.condition !== 'critical';
      if (isOperational) {
        skillDemand['work_efficiency'] = (skillDemand['work_efficiency'] || 0) + 1;
        
        // Building-specific skill demands
        switch (building.typeId) {
          case 'farm':
            skillDemand['agriculture'] = (skillDemand['agriculture'] || 0) + 2;
            break;
          case 'mine':
            skillDemand['mining'] = (skillDemand['mining'] || 0) + 2;
            break;
          case 'automation_workshop':
          case 'sawmill':
            skillDemand['crafting'] = (skillDemand['crafting'] || 0) + 2;
            break;
        }
      }
    }
    
    // Normalize skill demand
    const maxDemand = Math.max(...Object.values(skillDemand));
    for (const skill in skillDemand) {
      this.laborMarket.skillDemand[skill] = Math.min(100, (skillDemand[skill] / maxDemand) * 100);
    }
    
    // Update average wages based on economic conditions
    const wageMultiplier = 1 + (this.laborMarket.economicConditions.growth / 100);
    for (const category in this.laborMarket.averageWages) {
      this.laborMarket.averageWages[category] *= wageMultiplier;
    }
  }

  // Create workplace for building
  createWorkplace(buildingId: string, department: string): Workplace {
    const workplace: Workplace = {
      buildingId,
      department,
      workers: [],
      teamCohesion: 50,
      productivity: 60,
      morale: 70,
      workingConditions: {
        safety: 70,
        comfort: 60,
        equipment: 50,
        resources: 60
      },
      cultureType: 'collaborative',
      teamEvents: []
    };
    
    this.workplaces.set(buildingId, workplace);
    return workplace;
  }

  // Assign worker to workplace
  assignWorkerToWorkplace(workerId: string, buildingId: string): boolean {
    const worker = this.workers.get(workerId);
    const workplace = this.workplaces.get(buildingId);
    
    if (!worker || !workplace) return false;
    
    workplace.workers.push(workerId);
    return true;
  }

  // Get worker performance summary
  getWorkerPerformance(workerId: string): {
    efficiency: number;
    satisfaction: number;
    potential: number;
    issues: string[];
  } | null {
    const worker = this.workers.get(workerId);
    if (!worker) return null;
    
    const issues: string[] = [];
    if (worker.jobSatisfaction < 40) issues.push('Low job satisfaction');
    if (worker.burnoutRisk > 60) issues.push('High burnout risk');
    if (worker.workLifeBalance < 40) issues.push('Poor work-life balance');
    if (worker.efficiency < 50) issues.push('Below average efficiency');
    
    return {
      efficiency: worker.efficiency,
      satisfaction: worker.jobSatisfaction,
      potential: worker.promotionReadiness,
      issues
    };
  }

  // Get labor market summary
  getLaborMarketSummary(): {
    unemployment: number;
    averageWage: number;
    topSkillDemands: Array<{ skill: string; demand: number }>;
    economicHealth: number;
  } {
    const avgWage = Object.values(this.laborMarket.averageWages)
      .reduce((sum, wage) => sum + wage, 0) / Object.keys(this.laborMarket.averageWages).length;
    
    const skillDemands = Object.entries(this.laborMarket.skillDemand)
      .map(([skill, demand]) => ({ skill, demand }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 5);
    
    const economicHealth = (
      this.laborMarket.economicConditions.growth + 100 +
      (100 - this.laborMarket.economicConditions.inflation) +
      this.laborMarket.economicConditions.competitiveness
    ) / 3;
    
    return {
      unemployment: this.laborMarket.unemploymentRate,
      averageWage: avgWage,
      topSkillDemands: skillDemands,
      economicHealth
    };
  }

  // Utility functions
  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  // Public getters
  getWorker(id: string): WorkerProfile | undefined {
    return this.workers.get(id);
  }

  getAllWorkers(): WorkerProfile[] {
    return Array.from(this.workers.values());
  }

  getJobRoles(): JobRole[] {
    return Array.from(this.jobRoles.values());
  }

  getWorkplace(buildingId: string): Workplace | undefined {
    return this.workplaces.get(buildingId);
  }

  getLaborMarket(): LaborMarket {
    return this.laborMarket;
  }
  
  // Enhanced worker system integration methods
  
  /**
   * Create job assignments for buildings using enhanced system
   */
  createJobAssignments(buildings: SimulatedBuilding[]): void {
    for (const building of buildings) {
      const requiredWorkers = this.calculateRequiredWorkers(building);
      if (requiredWorkers > 0) {
        const priority = this.calculateJobPriority(building);
        workerSystem.createJobAssignment(building, requiredWorkers, priority);
      }
    }
  }
  
  /**
   * Calculate required workers for a building
   */
  private calculateRequiredWorkers(building: SimulatedBuilding): number {
    switch (building.typeId) {
      case 'farm':
        return Math.ceil(building.level * 2);
      case 'lumber_camp':
        return Math.ceil(building.level * 1.5);
      case 'sawmill':
        return Math.ceil(building.level * 3);
      case 'house':
        return 0; // Houses don't need workers
      default:
        return Math.ceil(building.level * 1);
    }
  }
  
  /**
   * Calculate job priority based on building importance
   */
  private calculateJobPriority(building: SimulatedBuilding): number {
    let priority = 50; // Base priority
    
    // Higher priority for resource production buildings
    switch (building.typeId) {
      case 'farm':
        priority = 80; // Food is critical
        break;
      case 'lumber_camp':
        priority = 70; // Wood is important
        break;
      case 'sawmill':
        priority = 60; // Processing is valuable
        break;
      default:
        priority = 40;
    }
    
    // Adjust based on building level and utility efficiency
    priority += building.level * 5;
    priority += (building.utilityEfficiency || 0.5) * 20;
    
    return Math.min(100, Math.max(0, priority));
  }
  
  /**
   * Assign workers to jobs using enhanced system
   */
  assignWorkersToJobs(gameTime: GameTime): void {
    workerSystem.assignWorkers(gameTime);
  }
  
  /**
   * Update training progress for all workers
   */
  updateWorkerTraining(gameTime: GameTime): void {
    workerSystem.updateTraining(gameTime);
  }
  
  /**
   * Get enhanced worker profile
   */
  getWorkerProfile(citizenId: string): SystemWorkerProfile | undefined {
    return workerSystem.getWorkerProfile(citizenId);
  }
  
  /**
   * Get job assignments for a building
   */
  getBuildingJobs(buildingId: string): JobAssignment[] {
    return workerSystem.getJobsForBuilding(buildingId);
  }
  
  /**
   * Remove worker from current job
   */
  removeWorkerFromJob(workerId: string, gameTime: GameTime): void {
    workerSystem.removeWorkerFromJob(workerId, gameTime);
  }
  
  /**
   * Clean up inactive workers and jobs
   */
  cleanupInactiveEntities(activeCitizenIds: string[], activeBuildingIds: string[]): void {
    workerSystem.cleanup(activeCitizenIds, activeBuildingIds);
  }
  
  /**
   * Get enhanced system statistics
   */
  getSystemStats() {
    return workerSystem.getSystemStats();
  }
  
  /**
   * Update the entire worker system for a cycle
   */
  updateSystem(gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    citizens: Citizen[];
  }, gameTime: GameTime): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    this.currentCycle = currentCycle;
    
    // Create job assignments for new buildings
    this.createJobAssignments(gameState.buildings);
    
    // Assign workers to jobs
    this.assignWorkersToJobs(gameTime);
    
    // Update training
    this.updateWorkerTraining(gameTime);
    
    // Update individual workers
    for (const worker of this.workers.values()) {
      this.updateWorker(worker.citizenId, gameTime, gameState);
    }
    
    // Clean up inactive entities
    const activeCitizenIds = gameState.citizens.map(c => c.id);
    const activeBuildingIds = gameState.buildings.map(b => b.id);
    this.cleanupInactiveEntities(activeCitizenIds, activeBuildingIds);
    
    // Update labor market
    this.updateLaborMarket({
      buildings: gameState.buildings,
      resources: gameState.resources,
      economicGrowth: 0 // Would be calculated from game state
    });
  }
}