import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizenBehavior';

// GameTime interface for worker system
interface GameTime {
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
  season: string;
}

// Worker specialization and skills
export interface WorkerSpecialization {
  id: string;
  name: string;
  requiredSkills: Record<string, number>; // skill -> minimum level
  efficiency: number; // base efficiency multiplier
  preferredBuildings: string[]; // building types this specialization works best in
  trainingTime: number; // cycles needed to train
  prerequisites?: string[]; // other specializations needed first
}

// Job assignment with priority and requirements
export interface JobAssignment {
  id: string;
  buildingId: string;
  buildingType: string;
  position: { x: number; y: number };
  requiredWorkers: number;
  currentWorkers: string[]; // citizen IDs
  priority: number; // 0-100, higher = more urgent
  skillRequirements: Record<string, number>;
  workConditions: {
    safety: number; // 0-100
    comfort: number; // 0-100
    socialInteraction: number; // 0-100
    autonomy: number; // 0-100
  };
  shifts: Array<{
    startHour: number;
    endHour: number;
    workersNeeded: number;
    currentWorkers: string[];
  }>;
  productivity: number; // current productivity level
  lastUpdated: number;
}

// Worker profile with preferences and performance
export interface WorkerProfile {
  citizenId: string;
  specializations: string[];
  currentJob?: string; // job assignment ID
  workHistory: Array<{
    jobId: string;
    buildingType: string;
    startCycle: number;
    endCycle?: number;
    performance: number; // 0-100
    satisfaction: number; // 0-100
  }>;
  preferences: {
    preferredShift: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
    maxCommute: number; // maximum distance willing to travel
    workStyle: 'independent' | 'collaborative' | 'leadership' | 'support';
    riskTolerance: number; // 0-100, willingness to work dangerous jobs
  };
  performance: {
    reliability: number; // 0-100, shows up consistently
    efficiency: number; // 0-100, work output quality
    adaptability: number; // 0-100, handles change well
    teamwork: number; // 0-100, works well with others
  };
  availability: {
    currentShift?: { start: number; end: number };
    daysOff: number[]; // day of week (0-6)
    vacationDays: number; // remaining vacation time
    sickDays: number; // remaining sick time
  };
  trainingProgress: Record<string, {
    specializationId: string;
    progress: number; // 0-100
    trainer?: string; // citizen ID of trainer
    estimatedCompletion: number; // cycle when training completes
  }>;
}

// Available worker specializations
const WORKER_SPECIALIZATIONS: WorkerSpecialization[] = [
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
    efficiency: 1.1, // lower personal efficiency but boosts team
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
      specializations: ['apprentice'], // Everyone starts as apprentice
      workHistory: [],
      preferences: {
        preferredShift: this.determinePreferredShift(citizen),
        maxCommute: 5 + citizen.personality.contentment * 10,
        workStyle: this.determineWorkStyle(citizen),
        riskTolerance: citizen.personality.curiosity * 100
      },
      performance: {
        reliability: 50 + citizen.personality.industriousness * 30,
        efficiency: 40 + citizen.personality.industriousness * 40,
        adaptability: 30 + citizen.personality.curiosity * 50,
        teamwork: 20 + citizen.personality.sociability * 60
      },
      availability: {
        daysOff: [],
        vacationDays: 10,
        sickDays: 5
      },
      trainingProgress: {}
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
      shifts: this.generateShifts(building.typeId, requiredWorkers),
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

  // Generate work shifts for building type
  private generateShifts(buildingType: string, totalWorkers: number) {
    const shifts = [];
    
    switch (buildingType) {
      case 'farm':
        // Farms work during daylight
        shifts.push({
          startHour: 6,
          endHour: 14,
          workersNeeded: Math.ceil(totalWorkers * 0.7),
          currentWorkers: []
        });
        shifts.push({
          startHour: 14,
          endHour: 18,
          workersNeeded: Math.ceil(totalWorkers * 0.3),
          currentWorkers: []
        });
        break;
        
      case 'lumber_camp':
        // Lumber camps work early morning
        shifts.push({
          startHour: 5,
          endHour: 13,
          workersNeeded: totalWorkers,
          currentWorkers: []
        });
        break;
        
      case 'sawmill':
        // Sawmills can work multiple shifts
        shifts.push({
          startHour: 7,
          endHour: 15,
          workersNeeded: Math.ceil(totalWorkers * 0.6),
          currentWorkers: []
        });
        shifts.push({
          startHour: 15,
          endHour: 23,
          workersNeeded: Math.ceil(totalWorkers * 0.4),
          currentWorkers: []
        });
        break;
        
      default:
        shifts.push({
          startHour: 8,
          endHour: 16,
          workersNeeded: totalWorkers,
          currentWorkers: []
        });
    }
    
    return shifts;
  }

  // Assign workers to jobs using intelligent matching
  assignWorkers(gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Get all available workers
    const availableWorkers = Array.from(this.workerProfiles.values())
      .filter(profile => !profile.currentJob);
    
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
      const workerSkill = 30 + worker.performance.efficiency * 0.5; // Simplified
      if (workerSkill >= required) {
        score += 20;
      } else {
        score -= (required - workerSkill) * 2;
      }
    }
    
    // Check distance preference
    const distance = 5; // Simplified - would calculate actual distance
    if (distance <= worker.preferences.maxCommute) {
      score += 15;
    } else {
      score -= (distance - worker.preferences.maxCommute) * 3;
    }
    
    // Check work conditions match
    const conditions = job.workConditions;
    if (worker.preferences.riskTolerance >= (100 - conditions.safety)) {
      score += 10;
    }
    
    // Check specialization match
    const hasRelevantSpec = worker.specializations.some(specId => {
      const spec = this.specializations.get(specId);
      return spec?.preferredBuildings.includes(job.buildingType);
    });
    
    if (hasRelevantSpec) {
      score += 25;
    }
    
    // Check work style compatibility
    if (job.currentWorkers.length === 0 && worker.preferences.workStyle === 'leadership') {
      score += 15; // Prefer leaders for new teams
    }
    
    if (job.currentWorkers.length > 0 && worker.preferences.workStyle === 'collaborative') {
      score += 10; // Collaborative workers fit well in existing teams
    }
    
    // Performance bonus
    score += (worker.performance.reliability + worker.performance.efficiency) * 0.2;
    
    return Math.max(0, Math.min(100, score));
  }

  // Assign specific worker to specific job
  private assignWorkerToJob(worker: WorkerProfile, job: JobAssignment, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Update worker profile
    worker.currentJob = job.id;
    
    // Add to job assignment
    job.currentWorkers.push(worker.citizenId);
    
    // Assign to appropriate shift based on preferences
    const preferredShift = this.findBestShift(worker, job);
    if (preferredShift) {
      preferredShift.currentWorkers.push(worker.citizenId);
    }
    
    // Record in work history
    worker.workHistory.push({
      jobId: job.id,
      buildingType: job.buildingType,
      startCycle: currentCycle,
      performance: 0, // Will be updated over time
      satisfaction: 0 // Will be calculated based on job fit
    });
    
    // Update job productivity
    this.updateJobProductivity(job);
  }

  // Find best shift for worker based on preferences
  private findBestShift(worker: WorkerProfile, job: JobAssignment) {
    const availableShifts = job.shifts.filter(shift => 
      shift.currentWorkers.length < shift.workersNeeded
    );
    
    if (availableShifts.length === 0) return null;
    
    // Score shifts based on worker preferences
    const scoredShifts = availableShifts.map(shift => {
      let score = 50;
      
      // Prefer shifts that match worker's preferred time
      switch (worker.preferences.preferredShift) {
        case 'morning':
          if (shift.startHour >= 5 && shift.startHour <= 8) score += 30;
          break;
        case 'afternoon':
          if (shift.startHour >= 12 && shift.startHour <= 16) score += 30;
          break;
        case 'evening':
          if (shift.startHour >= 16 && shift.startHour <= 20) score += 30;
          break;
        case 'night':
          if (shift.startHour >= 20 || shift.startHour <= 4) score += 30;
          break;
        case 'flexible':
          score += 10; // Flexible workers get small bonus for any shift
          break;
      }
      
      return { shift, score };
    });
    
    return scoredShifts.reduce((best, current) => 
      current.score > best.score ? current : best
    ).shift;
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
      
      let workerEfficiency = worker.performance.efficiency;
      
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
      return worker?.preferences.workStyle || 'support';
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
    if (!worker || !worker.currentJob) return;
    
    const job = this.jobAssignments.get(worker.currentJob);
    if (!job) return;
    
    // Update current work history entry
    const currentWork = worker.workHistory[worker.workHistory.length - 1];
    if (currentWork && !currentWork.endCycle) {
      // Calculate performance based on various factors
      let performance = worker.performance.efficiency;
      
      // Adjust based on job fit
      const jobFit = this.calculateJobFitScore(worker, job);
      performance *= (jobFit / 100);
      
      // Adjust based on work conditions
      const conditionsSatisfaction = this.calculateConditionsSatisfaction(worker, job);
      performance *= (conditionsSatisfaction / 100);
      
      currentWork.performance = performance;
      currentWork.satisfaction = conditionsSatisfaction;
      
      // Update worker's overall performance based on experience
      this.updateWorkerSkills(worker, job, gameTimeOrCycle);
    }
  }

  // Calculate how satisfied worker is with job conditions
  private calculateConditionsSatisfaction(worker: WorkerProfile, job: JobAssignment): number {
    let satisfaction = 50;
    
    const conditions = job.workConditions;
    
    // Safety satisfaction
    if (conditions.safety >= worker.preferences.riskTolerance) {
      satisfaction += 20;
    } else {
      satisfaction -= (worker.preferences.riskTolerance - conditions.safety) * 0.5;
    }
    
    // Social interaction satisfaction
    const teamSize = job.currentWorkers.length;
    if (worker.preferences.workStyle === 'collaborative' && teamSize > 1) {
      satisfaction += 15;
    } else if (worker.preferences.workStyle === 'independent' && teamSize === 1) {
      satisfaction += 15;
    }
    
    // Autonomy satisfaction
    if (worker.preferences.workStyle === 'leadership' && conditions.autonomy > 70) {
      satisfaction += 10;
    }
    
    return Math.max(0, Math.min(100, satisfaction));
  }

  // Update worker skills based on job experience
  private updateWorkerSkills(worker: WorkerProfile, job: JobAssignment, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    // Improve performance over time with experience
    const workDuration = worker.workHistory.length;
    const experienceBonus = Math.min(20, workDuration * 0.5);
    
    worker.performance.efficiency = Math.min(100, 
      worker.performance.efficiency + experienceBonus * 0.1
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
      worker.trainingProgress[bestSpec.id] = {
        specializationId: bestSpec.id,
        progress: 0,
        estimatedCompletion: currentCycle + bestSpec.trainingTime
      };
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
        if (training.progress < 100) {
          // Progress training based on worker's learning ability and job relevance
          const progressRate = 1 + (worker.performance.adaptability / 100);
          training.progress = Math.min(100, training.progress + progressRate);
          
          // Complete training if finished
          if (training.progress >= 100) {
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
    if (!worker || !worker.currentJob) return;
    
    const job = this.jobAssignments.get(worker.currentJob);
    if (job) {
      // Remove from job
      job.currentWorkers = job.currentWorkers.filter(id => id !== workerId);
      
      // Remove from shifts
      job.shifts.forEach(shift => {
        shift.currentWorkers = shift.currentWorkers.filter(id => id !== workerId);
      });
      
      // Update productivity
      this.updateJobProductivity(job);
    }
    
    // Update worker history
    const currentWork = worker.workHistory[worker.workHistory.length - 1];
    if (currentWork && !currentWork.endCycle) {
      currentWork.endCycle = currentCycle;
    }
    
    worker.currentJob = undefined;
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
    const employedWorkers = Array.from(this.workerProfiles.values())
      .filter(worker => worker.currentJob).length;
    
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