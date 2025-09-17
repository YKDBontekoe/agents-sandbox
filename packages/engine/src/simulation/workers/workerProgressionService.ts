import type { GameTime } from '../../types/gameTime';
import type { Citizen } from '../citizens/citizen';
import type { JobRole, WorkerProfile, Workplace } from './types';
import type { LaborMarket } from './laborMarketService';
import { calculateWageAdjustment, checkCareerProgression } from './career';
import { JobCatalogService } from './jobCatalogService';

export interface WorkerProgressionContext {
  gameTime: GameTime;
  jobCatalog: JobCatalogService;
  laborMarket: LaborMarket;
  citizen?: Citizen;
  workers: ReadonlyMap<string, WorkerProfile>;
  workplaces: ReadonlyMap<string, Workplace>;
  random?: () => number;
}

export class WorkerProgressionService {
  constructor(private readonly randomFn: () => number = Math.random) {}

  updateWorkerProgression(worker: WorkerProfile, context: WorkerProgressionContext): void {
    this.updateExperience(worker);
    this.updatePerformance(worker);
    this.updateJobSatisfaction(worker, context.citizen, context.laborMarket);
    checkCareerProgression(worker, context.gameTime, context.jobCatalog);
    this.updateWorkLifeBalance(worker);
    this.handleWorkplaceInteractions(
      worker,
      context.workers,
      context.workplaces,
      context.random ?? this.randomFn
    );
  }

  private updateExperience(worker: WorkerProfile): void {
    const baseGain = 1;
    const efficiencyBonus = worker.efficiency / 100;
    const experienceGain = baseGain * (1 + efficiencyBonus);

    worker.experienceLevel = Math.min(100, worker.experienceLevel + experienceGain);

    for (const skill of Object.keys(worker.currentRole.requiredSkills)) {
      const currentLevel = worker.trainingProgress[skill] || 0;
      const improvement = experienceGain * 0.5;
      worker.trainingProgress[skill] = Math.min(100, currentLevel + improvement);
    }
  }

  private updatePerformance(worker: WorkerProfile): void {
    const experienceBonus = worker.experienceLevel * 0.2;
    const stressPenalty = worker.stressLevel * 0.3;
    const targetEfficiency = Math.max(20, Math.min(100, 50 + experienceBonus - stressPenalty));
    worker.efficiency = this.lerp(worker.efficiency, targetEfficiency, 0.1);

    const satisfactionBonus = worker.jobSatisfaction * 0.3;
    const targetReliability = Math.max(30, Math.min(100, 60 + satisfactionBonus));
    worker.reliability = this.lerp(worker.reliability, targetReliability, 0.05);

    if (worker.currentRole.category === 'research') {
      worker.innovation = Math.min(100, worker.innovation + 0.5);
    }
  }

  private updateJobSatisfaction(
    worker: WorkerProfile,
    citizen: Citizen | undefined,
    laborMarket: LaborMarket
  ): void {
    if (!citizen) return;

    let satisfaction = worker.jobSatisfaction;

    const marketWage = laborMarket.averageWages[worker.currentRole.category] ?? worker.currentRole.baseWage;
    satisfaction += calculateWageAdjustment(worker, marketWage);

    if (worker.workLifeBalance < 40) {
      satisfaction -= 3;
    } else if (worker.workLifeBalance > 70) {
      satisfaction += 1;
    }

    if (worker.promotionReadiness > 80 && worker.careerLevel < worker.currentRole.maxLevel) {
      satisfaction -= 1;
    }

    const prestigeAlignment = worker.currentRole.prestige / 100;
    const ambitionAlignment = citizen.personality.ambition;
    if (Math.abs(prestigeAlignment - ambitionAlignment) > 0.3) {
      satisfaction -= 1;
    }

    worker.jobSatisfaction = Math.max(0, Math.min(100, satisfaction));
  }

  private updateWorkLifeBalance(worker: WorkerProfile): void {
    const totalHours = worker.hoursPerWeek + worker.overtimeHours;
    const workloadStress = worker.currentRole.workload;
    const workPressure = (totalHours - 40) * 2 + workloadStress;

    const targetBalance = Math.max(20, 100 - workPressure);
    worker.workLifeBalance = this.lerp(worker.workLifeBalance, targetBalance, 0.1);

    worker.stressLevel = Math.min(100, workPressure * 0.8);
    worker.burnoutRisk = Math.max(0, worker.stressLevel - worker.workLifeBalance);
  }

  private handleWorkplaceInteractions(
    worker: WorkerProfile,
    workers: ReadonlyMap<string, WorkerProfile>,
    workplaces: ReadonlyMap<string, Workplace>,
    random: () => number
  ): void {
    const workplace = Array.from(workplaces.values()).find(w => w.workers.includes(worker.citizenId));
    if (!workplace) return;

    if (random() < 0.1) {
      const coworkers = workplace.workers.filter(id => id !== worker.citizenId);
      if (coworkers.length > 0) {
        const coworkerId = coworkers[Math.floor(random() * coworkers.length)];
        this.processWorkplaceInteraction(worker, coworkerId, workplace, workers);
      }
    }
  }

  private processWorkplaceInteraction(
    worker: WorkerProfile,
    coworkerId: string,
    workplace: Workplace,
    workers: ReadonlyMap<string, WorkerProfile>
  ): void {
    const coworker = workers.get(coworkerId);
    if (!coworker) return;

    let relationship = worker.workplaceRelationships.find(r => r.coworkerId === coworkerId);
    if (!relationship) {
      relationship = {
        coworkerId,
        relationship: 'peer',
        quality: 50
      };
      worker.workplaceRelationships.push(relationship);
    }

    const interactionSuccess = (worker.teamwork + coworker.teamwork) / 2;
    const qualityChange = interactionSuccess > 60 ? 2 : interactionSuccess < 40 ? -1 : 0;

    relationship.quality = Math.max(0, Math.min(100, relationship.quality + qualityChange));

    if (qualityChange > 0) {
      workplace.morale = Math.min(100, workplace.morale + 0.5);
      workplace.teamCohesion = Math.min(100, workplace.teamCohesion + 0.3);
    }
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }
}
