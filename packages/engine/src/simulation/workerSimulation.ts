import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizens/citizen';
import { workerSystem } from './workerSystem';
import type {
  JobAssignment,
  WorkerProfile as SystemWorkerProfile,
  JobRole,
  WorkerProfile,
  Workplace,
} from './workers/types';
import type { GameTime } from '../types/gameTime';
import { JobCatalogService } from './workers/jobCatalogService';
import { WorkerRepository } from './workers/workerRepository';
import { LaborMarketService, type LaborMarket } from './workers/laborMarketService';
import { WorkerProgressionService } from './workers/workerProgressionService';
export type { LaborMarket } from './workers/laborMarketService';

export interface WorkerSimulationOptions {
  jobCatalogService?: JobCatalogService;
  jobCatalog?: Iterable<JobRole> | Map<string, JobRole>;
  laborMarketService?: LaborMarketService;
  workerProgressionService?: WorkerProgressionService;
  workerRepository?: WorkerRepository;
}

// Worker simulation system
export class WorkerSimulationSystem {
  private readonly repository: WorkerRepository;
  private readonly jobCatalog: JobCatalogService;
  private readonly laborMarketService: LaborMarketService;
  private readonly workerProgressionService: WorkerProgressionService;
  private currentCycle: number = 0;

  constructor(options: WorkerSimulationOptions = {}) {
    this.repository = options.workerRepository ?? new WorkerRepository();
    this.jobCatalog =
      options.jobCatalogService ??
      new JobCatalogService(options.jobCatalog ?? undefined);
    this.laborMarketService = options.laborMarketService ?? new LaborMarketService();
    this.workerProgressionService = options.workerProgressionService ?? new WorkerProgressionService();
  }

  // Create worker profile for a citizen
  createWorker(citizen: Citizen, roleId: string): WorkerProfile | null {
    const qualification = this.jobCatalog.evaluateCitizenForRole(citizen, roleId);
    const role = qualification.role;
    if (!role || !qualification.qualified) return null;

    // Initialize enhanced worker profile
    workerSystem.initializeWorker(citizen);

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

    this.repository.upsertWorker(worker);
    return worker;
  }

  // Update worker using GameTime
  updateWorker(workerId: string, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    citizens: Citizen[];
  }): void {
    const worker = this.repository.getWorker(workerId);
    if (!worker) return;

    // Convert GameTime to cycle for backward compatibility
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    this.currentCycle = currentCycle;

    // Update enhanced worker system
    workerSystem.updateWorkerPerformance(workerId, currentCycle);

    const citizen = gameState.citizens.find(c => c.id === worker.citizenId);
    this.workerProgressionService.updateWorkerProgression(worker, {
      gameTime,
      jobCatalog: this.jobCatalog,
      laborMarket: this.laborMarketService.getLaborMarket(),
      citizen,
      workers: this.repository.getWorkerMap(),
      workplaces: this.repository.getWorkplaceMap(),
    });
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

    this.repository.upsertWorkplace(workplace);
    return workplace;
  }

  // Assign worker to workplace
  assignWorkerToWorkplace(workerId: string, buildingId: string): boolean {
    const worker = this.repository.getWorker(workerId);
    const workplace = this.repository.getWorkplace(buildingId);

    if (!worker || !workplace) return false;

    if (!workplace.workers.includes(workerId)) {
      workplace.workers.push(workerId);
    }
    return true;
  }

  // Get worker performance summary
  getWorkerPerformance(workerId: string): {
    efficiency: number;
    satisfaction: number;
    potential: number;
    issues: string[];
  } | null {
    const worker = this.repository.getWorker(workerId);
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
    return this.laborMarketService.getSummary();
  }

  // Public getters
  getWorker(id: string): WorkerProfile | undefined {
    return this.repository.getWorker(id);
  }

  getAllWorkers(): WorkerProfile[] {
    return this.repository.getAllWorkers();
  }

  getJobRoles(): JobRole[] {
    return this.jobCatalog.listRoles();
  }

  getWorkplace(buildingId: string): Workplace | undefined {
    return this.repository.getWorkplace(buildingId);
  }

  getLaborMarket(): LaborMarket {
    return this.laborMarketService.getLaborMarket();
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
    for (const worker of this.repository.getAllWorkers()) {
      this.updateWorker(worker.citizenId, gameTime, gameState);
    }
    
    // Clean up inactive entities
    const activeCitizenIds = gameState.citizens.map(c => c.id);
    const activeBuildingIds = gameState.buildings.map(b => b.id);
    this.cleanupInactiveEntities(activeCitizenIds, activeBuildingIds);
    
    // Update labor market
    this.laborMarketService.updateLaborMarket({
      buildings: gameState.buildings,
      resources: gameState.resources,
      economicGrowth: 0 // Would be calculated from game state
    });
  }
}