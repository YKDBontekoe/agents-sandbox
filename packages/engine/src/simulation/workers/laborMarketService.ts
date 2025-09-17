import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings';

export interface LaborMarketJobOpening {
  roleId: string;
  buildingId: string;
  urgency: number;
  wageOffer: number;
  requirements: Record<string, number>;
  benefits: string[];
}

export interface LaborMarketTrainingProgram {
  id: string;
  skill: string;
  duration: number;
  cost: number;
  effectiveness: number;
  availability: number;
}

export interface LaborMarket {
  jobOpenings: LaborMarketJobOpening[];
  unemploymentRate: number;
  averageWages: Record<string, number>;
  skillDemand: Record<string, number>;
  economicConditions: {
    growth: number;
    inflation: number;
    competitiveness: number;
  };
  trainingPrograms: LaborMarketTrainingProgram[];
}

export interface LaborMarketUpdateContext {
  buildings: SimulatedBuilding[];
  resources: SimResources;
  economicGrowth: number;
}

export class LaborMarketService {
  private market: LaborMarket;

  constructor(initialMarket?: LaborMarket) {
    this.market = initialMarket
      ? LaborMarketService.cloneMarket(initialMarket)
      : LaborMarketService.createDefaultMarket();
  }

  getLaborMarket(): LaborMarket {
    return this.market;
  }

  getAverageWage(category: string): number | undefined {
    return this.market.averageWages[category];
  }

  updateLaborMarket({ buildings, economicGrowth }: LaborMarketUpdateContext): void {
    this.market.economicConditions.growth = economicGrowth;

    const skillDemand: Record<string, number> = {};
    for (const building of buildings) {
      const isOperational = building.workers > 0 && building.condition !== 'critical';
      if (!isOperational) continue;

      skillDemand.work_efficiency = (skillDemand.work_efficiency || 0) + 1;

      switch (building.typeId) {
        case 'farm':
          skillDemand.agriculture = (skillDemand.agriculture || 0) + 2;
          break;
        case 'mine':
          skillDemand.mining = (skillDemand.mining || 0) + 2;
          break;
        case 'automation_workshop':
        case 'sawmill':
          skillDemand.crafting = (skillDemand.crafting || 0) + 2;
          break;
        default:
          break;
      }
    }

    if (Object.keys(skillDemand).length > 0) {
      const maxDemand = Object.values(skillDemand).reduce((max, value) => Math.max(max, value), 0);
      const divisor = maxDemand > 0 ? maxDemand : 1;
      for (const skill of Object.keys(skillDemand)) {
        const normalized = (skillDemand[skill] / divisor) * 100;
        this.market.skillDemand[skill] = Math.min(100, normalized);
      }
    }

    const wageMultiplier = 1 + this.market.economicConditions.growth / 100;
    for (const category of Object.keys(this.market.averageWages)) {
      this.market.averageWages[category] *= wageMultiplier;
    }
  }

  getSummary(): {
    unemployment: number;
    averageWage: number;
    topSkillDemands: Array<{ skill: string; demand: number }>;
    economicHealth: number;
  } {
    const wages = Object.values(this.market.averageWages);
    const averageWage = wages.length > 0
      ? wages.reduce((sum, wage) => sum + wage, 0) / wages.length
      : 0;

    const topSkillDemands = Object.entries(this.market.skillDemand)
      .map(([skill, demand]) => ({ skill, demand }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 5);

    const { growth, inflation, competitiveness } = this.market.economicConditions;
    const economicHealth = (growth + 100 + (100 - inflation) + competitiveness) / 3;

    return {
      unemployment: this.market.unemploymentRate,
      averageWage,
      topSkillDemands,
      economicHealth
    };
  }

  private static createDefaultMarket(): LaborMarket {
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

  private static cloneMarket(market: LaborMarket): LaborMarket {
    return {
      jobOpenings: market.jobOpenings.map(opening => ({
        ...opening,
        requirements: { ...opening.requirements },
        benefits: [...opening.benefits]
      })),
      unemploymentRate: market.unemploymentRate,
      averageWages: { ...market.averageWages },
      skillDemand: { ...market.skillDemand },
      economicConditions: { ...market.economicConditions },
      trainingPrograms: market.trainingPrograms.map(program => ({ ...program }))
    };
  }
}
