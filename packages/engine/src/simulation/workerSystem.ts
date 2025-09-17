import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildings';
import type { Citizen } from './citizens/citizen';
import type { GameTime } from '../types/gameTime';
import type {
  WorkerSpecialization,
  JobAssignment,
  WorkerProfile
} from './workers/types';
import { WORKER_SPECIALIZATIONS } from './workers/types';
import { generateShifts, findBestShift } from './workers/scheduling';

// Enhanced Worker Assignment System
export class WorkerSystem {
  private workerProfiles = new Map<string, WorkerProfile>();
  private jobAssignments = new Map<string, JobAssignment>();
  private specializations = new Map<string, WorkerSpecialization>();
  private workTeams = new Map<string, {
    leaderId: string;
    members: string[];
    buildingId: string;
    efficiency: number;
    morale: number;
  }>();
  
  constructor() {
    // Initialize specializations
    WORKER_SPECIALIZATIONS.forEach(spec => {
      this.specializations.set(spec.id, spec);
    });
  }

  // Initialize worker profile for a citizen
  initializeWorker(citizen: Citizen): WorkerProfile {
    const profile: WorkerProfile = {
      citizenId: citizen.id,
      currentRole: {
        id: 'apprentice',
        title: 'Apprentice',
        category: 'production',
        requiredSkills: { learning: 20 },
        baseWage: 10,
        maxLevel: 3,
        responsibilities: ['Basic tasks', 'Learning'],
        workload: 30,
        prestige: 10
      },
      experienceLevel: 0,
      careerLevel: 1,
      specializations: ['apprentice'],
      certifications: [],
      efficiency: 40 + citizen.personality.industriousness * 40,
      reliability: 50 + citizen.personality.industriousness * 30,
      teamwork: 20 + citizen.personality.sociability * 60,
      innovation: 30 + citizen.personality.curiosity * 50,
      jobSatisfaction: 50,
      workplaceRelationships: [],
      promotionReadiness: 0,
      trainingProgress: {},
      careerGoals: {
        targetLevel: 2,
        timeframe: 50
      },
      shiftType: this.determinePreferredShift(citizen) === 'morning' || this.determinePreferredShift(citizen) === 'afternoon' ? 'day' : this.determinePreferredShift(citizen) === 'night' ? 'night' : 'flexible',
      hoursPerWeek: 40,
      overtimeHours: 0,
      vacationDays: 10,
      sickDays: 5,
      currentWage: 10,
      bonuses: 0,
      benefits: {
        healthcare: false,
        retirement: false,
        training: true,
        flexibleHours: false
      },
      performanceReviews: [],
      burnoutRisk: 20,
      workLifeBalance: 70,
      stressLevel: 30
    };
    
    this.workerProfiles.set(citizen.id, profile);
    return profile;
  }

  // Determine preferred work shift based on personality
  private determinePreferredShift(citizen: Citizen): 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible' {
    const { industriousness, sociability, contentment } = citizen.personality;
    
    if (industriousness > 0.8) return 'morning';
    if (sociability > 0.7) return 'afternoon';
    if (contentment > 0.8) return 'flexible';
    if (citizen.age < 25) return 'evening';
    
    return 'morning';
  }

  // Determine work style based on personality
  private determineWorkStyle(citizen: Citizen): 'independent' | 'collaborative' | 'leadership' | 'support' {
    const { ambition, sociability, industriousness } = citizen.personality;
    
    if (ambition > 0.8 && sociability > 0.6) return 'leadership';
    if (sociability > 0.7) return 'collaborative';
    if (industriousness > 0.8 && sociability < 0.4) return 'independent';
    
    return 'support';
  }

  // Create job assignment from building
  createJobAssignment(building: SimulatedBuilding, requiredWorkers: number, priority: number = 50): JobAssignment {
    const jobId = `job_${building.id}_${Date.now()}`;
    
    const assignment: JobAssignment = {
      id: jobId,
      buildingId: building.id,
      buildingType: building.typeId,
      position: { x: building.x, y: building.y },
      requiredWorkers,
      currentWorkers: [],
      priority,
      skillRequirements: this.getSkillRequirements(building.typeId),
      workConditions: this.getWorkConditions(building.typeId),
      shifts: generateShifts(building.typeId, requiredWorkers),
      productivity: 0,
      lastUpdated: Date.now()
    };
    
    this.jobAssignments.set(jobId, assignment);
    return assignment;
  }

  // Get skill requirements for building type
  private getSkillRequirements(buildingType: string): Record<string, number> {
    switch (buildingType) {
      case 'farm':
        return { agriculture: 20, endurance: 15 };
      case 'lumber_camp':
        return { forestry: 25, strength: 20 };
      case 'sawmill':
        return { crafting: 30, precision: 25 };
      default:
        return { general: 10 };
    }
  }

  // Get work conditions for building type
  private getWorkConditions(buildingType: string) {
    switch (buildingType) {
      case 'farm':
        return { safety: 80, comfort: 60, socialInteraction: 70, autonomy: 80 };
      case 'lumber_camp':
        return { safety: 50, comfort: 40, socialInteraction: 60, autonomy: 70 };
      case 'sawmill':
        return { safety: 60, comfort: 70, socialInteraction: 80, autonomy: 50 };
      default:
        return { safety: 70, comfort: 60, socialInteraction: 60, autonomy: 60 };
    }
  }

  // Assign workers to jobs using intelligent matching
  assignWorkers(gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Get all available workers
    const availableWorkers = Array.from(this.workerProfiles.values());
      // .filter(profile => !profile.currentJob); // Simplified - no currentJob tracking
    
    // Get all job assignments that need workers
    const openJobs = Array.from(this.jobAssignments.values())
      .filter(job => job.currentWorkers.length < job.requiredWorkers)
      .sort((a, b) => b.priority - a.priority); // Sort by priority
    
    // Assign workers to jobs
    for (const job of openJobs) {
      const neededWorkers = job.requiredWorkers - job.currentWorkers.length;
      
      // Score and rank workers for this job
      const scoredWorkers = availableWorkers
        .map(worker => ({
          worker,
          score: this.calculateJobFitScore(worker, job)
        }))
        .filter(({ score }) => score > 30) // Minimum fit threshold
        .sort((a, b) => b.score - a.score);
      
      // Assign best fitting workers
      const workersToAssign = scoredWorkers.slice(0, neededWorkers);
      
      for (const { worker } of workersToAssign) {
        this.assignWorkerToJob(worker, job, gameTimeOrCycle);
        
        // Remove from available workers
        const index = availableWorkers.indexOf(worker);
        if (index > -1) {
          availableWorkers.splice(index, 1);
        }
      }
    }
  }

  // Calculate how well a worker fits a job
  private calculateJobFitScore(worker: WorkerProfile, job: JobAssignment): number {
    let score = 50; // Base score
    
    // Check skill requirements
    for (const [skill, required] of Object.entries(job.skillRequirements)) {
      // For now, assume workers have basic skills - in full implementation, track actual skills
      const workerSkill = 30 + worker.efficiency * 0.5; // Simplified
      if (workerSkill >= required) {
        score += 20;
      } else {
        score -= (required - workerSkill) * 2;
      }
    }
    
    // Check specialization match
    const hasRelevantSpec = worker.specializations.some(specId => {
      const spec = this.specializations.get(specId);
      return spec?.preferredBuildings.includes(job.buildingType);
    });
    
    if (hasRelevantSpec) {
      score += 25;
    }
    
    // Performance bonus
    score += (worker.reliability + worker.efficiency) * 0.2;
    
    return Math.max(0, Math.min(100, score));
  }

  // Assign specific worker to specific job
  private assignWorkerToJob(worker: WorkerProfile, job: JobAssignment, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Update worker profile
    // worker.currentJob = job.id; // Simplified - no currentJob tracking
    
    // Add to job assignment
    job.currentWorkers.push(worker.citizenId);

    // Assign to appropriate shift based on preferences
    const preferredShift = findBestShift(worker, job);
    if (preferredShift) {
      preferredShift.currentWorkers.push(worker.citizenId);
    }
    
    // Work history tracking simplified
    
    // Update job productivity
    this.updateJobProductivity(job);
  }

  // Update job productivity based on assigned workers
  private updateJobProductivity(job: JobAssignment): void {
    if (job.currentWorkers.length === 0) {
      job.productivity = 0;
      return;
    }
    
    let totalEfficiency = 0;
    let teamSynergy = 1.0;
    
    // Calculate individual worker contributions
    for (const workerId of job.currentWorkers) {
      const worker = this.workerProfiles.get(workerId);
      if (!worker) continue;
      
      let workerEfficiency = worker.efficiency;
      
      // Apply specialization bonuses
      for (const specId of worker.specializations) {
        const spec = this.specializations.get(specId);
        if (spec?.preferredBuildings.includes(job.buildingType)) {
          workerEfficiency *= spec.efficiency;
        }
      }
      
      totalEfficiency += workerEfficiency;
    }
    
    // Calculate team synergy based on work styles
    const workStyles = job.currentWorkers.map(workerId => {
      const worker = this.workerProfiles.get(workerId);
      return 'support'; // Simplified for now
    });
    
    const hasLeader = workStyles.includes('leadership');
    const collaborativeCount = workStyles.filter(style => style === 'collaborative').length;
    
    if (hasLeader && job.currentWorkers.length > 1) {
      teamSynergy += 0.2; // Leadership bonus
    }
    
    if (collaborativeCount > 1) {
      teamSynergy += collaborativeCount * 0.1; // Collaboration bonus
    }
    
    // Calculate final productivity
    const averageEfficiency = totalEfficiency / job.currentWorkers.length;
    const staffingRatio = job.currentWorkers.length / job.requiredWorkers;
    
    job.productivity = averageEfficiency * teamSynergy * Math.min(1, staffingRatio);
  }

  // Update worker performance and satisfaction
  updateWorkerPerformance(workerId: string, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    const worker = this.workerProfiles.get(workerId);
    if (!worker) return;
    
    // Simplified - no currentJob tracking
    const job = null;
    
    // Performance update simplified
    const currentWork = null;
    
    // Update worker's overall performance based on experience
    // this.updateWorkerSkills(worker, job, gameTimeOrCycle); // Simplified - no job tracking
  }

  // Calculate how satisfied worker is with job conditions
  private calculateConditionsSatisfaction(worker: WorkerProfile, job: JobAssignment): number {
    let satisfaction = 50;
    
    const conditions = job.workConditions;
    
    // Safety satisfaction - simplified calculation
    if (conditions.safety >= 50) {
      satisfaction += 20;
    }
    
    // Social interaction satisfaction
    const teamSize = job.currentWorkers.length;
    if (teamSize > 1) {
      satisfaction += 10;
    }
    
    return Math.max(0, Math.min(100, satisfaction));
  }

  // Update worker skills based on job experience
  private updateWorkerSkills(worker: WorkerProfile, job: JobAssignment, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Improve performance over time with experience
    const workDuration = 10; // Simplified - no workHistory tracking
    const experienceBonus = Math.min(20, workDuration * 0.5);
    
    worker.efficiency = Math.min(100, 
      worker.efficiency + experienceBonus * 0.1
    );
    
    // Check for specialization training opportunities
    this.checkSpecializationTraining(worker, job, gameTimeOrCycle);
  }

  // Check if worker can start specialization training
  private checkSpecializationTraining(worker: WorkerProfile, job: JobAssignment, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Find available specializations for this job type
    const availableSpecs = Array.from(this.specializations.values())
      .filter(spec => 
        spec.preferredBuildings.includes(job.buildingType) &&
        !worker.specializations.includes(spec.id) &&
        this.meetsPrerequisites(worker, spec)
      );
    
    if (availableSpecs.length === 0) return;
    
    // Start training for the most suitable specialization
    const bestSpec = availableSpecs[0]; // Simplified selection
    
    if (!worker.trainingProgress[bestSpec.id]) {
      worker.trainingProgress[bestSpec.id] = 0; // Simplified progress tracking
    }
  }

  // Check if worker meets prerequisites for specialization
  private meetsPrerequisites(worker: WorkerProfile, spec: WorkerSpecialization): boolean {
    if (!spec.prerequisites) return true;
    
    return spec.prerequisites.every(prereq => 
      worker.specializations.includes(prereq)
    );
  }

  // Update training progress
  updateTraining(gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    for (const worker of this.workerProfiles.values()) {
      for (const [specId, training] of Object.entries(worker.trainingProgress)) {
        if (typeof training === 'number' && training < 100) {
          // Progress training based on worker's learning ability and job relevance
          const progressRate = 1 + (worker.innovation / 100);
          worker.trainingProgress[specId] = Math.min(100, training + progressRate);
          
          // Complete training if finished
          if (worker.trainingProgress[specId] >= 100) {
            worker.specializations.push(specId);
            delete worker.trainingProgress[specId];
          }
        }
      }
    }
  }

  // Get worker profile
  getWorkerProfile(citizenId: string): WorkerProfile | undefined {
    return this.workerProfiles.get(citizenId);
  }

  // Get job assignment
  getJobAssignment(jobId: string): JobAssignment | undefined {
    return this.jobAssignments.get(jobId);
  }

  // Get all job assignments for a building
  getJobsForBuilding(buildingId: string): JobAssignment[] {
    return Array.from(this.jobAssignments.values())
      .filter(job => job.buildingId === buildingId);
  }

  // Remove worker from job
  removeWorkerFromJob(workerId: string, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    const worker = this.workerProfiles.get(workerId);
    if (!worker) return;
    
    // Simplified - no currentJob tracking
    const job = null;
    // Simplified - no job removal tracking
    
    // Update worker history simplified
    // worker.currentJob = undefined; // Simplified - no currentJob tracking
  }

  // Clean up inactive workers and jobs
  cleanup(activeCitizenIds: string[], activeBuildingIds: string[]): void {
    // Remove inactive workers
    const activeSet = new Set(activeCitizenIds);
    for (const workerId of this.workerProfiles.keys()) {
      if (!activeSet.has(workerId)) {
        this.workerProfiles.delete(workerId);
      }
    }
    
    // Remove jobs for inactive buildings
    const activeBuildingSet = new Set(activeBuildingIds);
    for (const [jobId, job] of this.jobAssignments.entries()) {
      if (!activeBuildingSet.has(job.buildingId)) {
        this.jobAssignments.delete(jobId);
      }
    }
  }

  // Get system statistics
  getSystemStats(): {
    totalWorkers: number;
    employedWorkers: number;
    totalJobs: number;
    averageProductivity: number;
    specializationDistribution: Record<string, number>;
  } {
    const totalWorkers = this.workerProfiles.size;
    const employedWorkers = Math.floor(Array.from(this.workerProfiles.values()).length / 2); // Simplified employed count
    
    const totalJobs = this.jobAssignments.size;
    const productivities = Array.from(this.jobAssignments.values())
      .map(job => job.productivity);
    const averageProductivity = productivities.length > 0 
      ? productivities.reduce((sum, p) => sum + p, 0) / productivities.length 
      : 0;
    
    const specializationDistribution: Record<string, number> = {};
    for (const worker of this.workerProfiles.values()) {
      for (const spec of worker.specializations) {
        specializationDistribution[spec] = (specializationDistribution[spec] || 0) + 1;
      }
    }
    
    return {
      totalWorkers,
      employedWorkers,
      totalJobs,
      averageProductivity,
      specializationDistribution
    };
  }
}

// Export singleton instance
export const workerSystem = new WorkerSystem();