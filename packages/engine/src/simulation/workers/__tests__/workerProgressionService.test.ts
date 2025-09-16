import { describe, it, expect } from 'vitest';
import { WorkerProgressionService } from '../workerProgressionService';
import { createDefaultJobCatalog } from '../jobCatalog';
import { LaborMarketService } from '../laborMarketService';
import type { WorkerProfile, Workplace } from '../types';
import type { Citizen } from '@engine/simulation/citizenBehavior';
import { createGameTime } from '@engine/types/gameTime';

function createWorkerProfile(roleId: string): { worker: WorkerProfile; coworker: WorkerProfile } {
  const catalog = createDefaultJobCatalog();
  const role = catalog.get(roleId);
  if (!role) {
    throw new Error(`Missing role ${roleId}`);
  }

  const baseProfile: WorkerProfile = {
    citizenId: 'citizen-1',
    currentRole: role,
    experienceLevel: 0,
    careerLevel: 1,
    specializations: [],
    certifications: [],
    efficiency: 50,
    reliability: 60,
    teamwork: 70,
    innovation: 30,
    jobSatisfaction: 70,
    workplaceRelationships: [],
    promotionReadiness: 0,
    trainingProgress: {},
    careerGoals: {
      targetLevel: 2,
      timeframe: 50,
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
      flexibleHours: false,
    },
    performanceReviews: [],
    burnoutRisk: 20,
    workLifeBalance: 70,
    stressLevel: 30,
  };

  const coworker: WorkerProfile = {
    ...baseProfile,
    citizenId: 'citizen-2',
    teamwork: 80,
  };

  return { worker: { ...baseProfile }, coworker };
}

describe('WorkerProgressionService', () => {
  it('updates worker progression metrics and workplace relationships', () => {
    const { worker, coworker } = createWorkerProfile('farmer');

    const workers = new Map<string, WorkerProfile>([
      [worker.citizenId, worker],
      [coworker.citizenId, coworker],
    ]);

    const workplace: Workplace = {
      buildingId: 'building-1',
      department: 'field operations',
      workers: [worker.citizenId, coworker.citizenId],
      teamCohesion: 50,
      productivity: 60,
      morale: 70,
      workingConditions: {
        safety: 70,
        comfort: 60,
        equipment: 50,
        resources: 60,
      },
      cultureType: 'collaborative',
      teamEvents: [],
    };

    const workplaces = new Map<string, Workplace>([[workplace.buildingId, workplace]]);

    const laborMarketService = new LaborMarketService();
    const laborMarket = laborMarketService.getLaborMarket();

    const citizen = {
      id: worker.citizenId,
      personality: {
        ambition: 0.5,
        sociability: 0.6,
        industriousness: 0.7,
        contentment: 0.8,
        curiosity: 0.5,
      },
      skills: {
        agriculture: 40,
        physical_strength: 40,
      },
    } as unknown as Citizen;

    const progression = new WorkerProgressionService();
    const randomValues = [0.05, 0.05];
    const randomMock = () => (randomValues.length > 0 ? randomValues.shift()! : 0.5);

    progression.updateWorkerProgression(worker, {
      gameTime: createGameTime(0),
      jobRoles: createDefaultJobCatalog(),
      laborMarket,
      citizen,
      workers,
      workplaces,
      random: randomMock,
    });

    expect(worker.experienceLevel).toBeGreaterThan(0);
    expect(worker.trainingProgress.agriculture).toBeGreaterThan(0);
    expect(worker.efficiency).toBeLessThan(50);
    expect(worker.reliability).toBeGreaterThan(60);
    expect(worker.workLifeBalance).toBeLessThan(70);
    expect(worker.stressLevel).toBeGreaterThan(30);

    expect(worker.workplaceRelationships).toHaveLength(1);
    expect(worker.workplaceRelationships[0]).toMatchObject({ coworkerId: 'citizen-2' });
    expect(worker.workplaceRelationships[0].quality).toBeGreaterThan(50);

    expect(workplace.morale).toBeGreaterThan(70);
    expect(workplace.teamCohesion).toBeGreaterThan(50);
  });
});
