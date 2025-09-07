import type { GameTime } from '../types/gameTime';
import type { JobRole, WorkerProfile } from './types';

// Adjust job satisfaction based on how a worker's wage compares to the market
export function calculateWageAdjustment(worker: WorkerProfile, marketWage: number): number {
  const wageRatio = worker.currentWage / marketWage;
  if (wageRatio < 0.8) return -2;
  if (wageRatio > 1.2) return 1;
  return 0;
}

// Evaluate promotion readiness and potential job changes
export function checkCareerProgression(
  worker: WorkerProfile,
  gameTime: GameTime,
  jobRoles: Map<string, JobRole>
): void {
  const currentCycle = Math.floor(gameTime.totalMinutes / 60);

  if (worker.experienceLevel > 70 && worker.efficiency > 60) {
    worker.promotionReadiness = Math.min(100, worker.promotionReadiness + 2);
  }

  if (
    worker.promotionReadiness > 80 &&
    worker.careerLevel < worker.currentRole.maxLevel &&
    Math.random() < 0.05
  ) {
    promoteWorker(worker, currentCycle);
  }

  if (worker.jobSatisfaction < 30 && Math.random() < 0.02) {
    considerJobChange(worker, jobRoles);
  }
}

// Promote worker to the next career level with wage and benefit updates
export function promoteWorker(worker: WorkerProfile, currentCycle: number): void {
  worker.careerLevel++;
  worker.experienceLevel = 0;
  worker.promotionReadiness = 0;

  const wageIncrease = worker.currentRole.baseWage * 0.2;
  worker.currentWage += wageIncrease;

  if (worker.careerLevel >= 3) {
    worker.benefits.healthcare = true;
    worker.benefits.training = true;
  }
  if (worker.careerLevel >= 4) {
    worker.benefits.retirement = true;
    worker.benefits.flexibleHours = true;
  }

  worker.performanceReviews.push({
    cycle: currentCycle,
    overallRating: 85,
    strengths: ['Leadership potential', 'Consistent performance'],
    improvements: ['Continue skill development'],
    wageAdjustment: wageIncrease,
  });

  worker.jobSatisfaction = Math.min(100, worker.jobSatisfaction + 15);
}

// Consider switching jobs when better opportunities exist
export function considerJobChange(worker: WorkerProfile, jobRoles: Map<string, JobRole>): void {
  const availableRoles = Array.from(jobRoles.values()).filter(
    (role) => role.id !== worker.currentRole.id
  );

  for (const role of availableRoles) {
    if (
      role.baseWage > worker.currentWage * 1.1 ||
      role.prestige > worker.currentRole.prestige + 10
    ) {
      worker.careerGoals.targetRole = role.id;
      break;
    }
  }
}

