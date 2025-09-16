import { ServiceType, type CityServicesSystem } from '../cityServices';
import type { PublicTransportSystem } from '../transport/transportSystem';
import type { RoadNetworkSystem } from '../roadNetwork';
import type { CityBuilding, CityCitizen, CityMetrics } from './types';

export interface MetricsComputationArgs {
  citizens: ReadonlyArray<CityCitizen>;
  buildings: ReadonlyArray<CityBuilding>;
  currentMetrics: CityMetrics;
}

export interface MetricsComputationResult {
  metrics: Partial<CityMetrics>;
  budgetDelta: number;
}

type CityServicesReadModel = Pick<CityServicesSystem, 'getServiceStats' | 'getAllServiceStats'>;
type TransportStatsProvider = Pick<PublicTransportSystem, 'getSystemStats'>;
type RoadNetworkView = Pick<RoadNetworkSystem, 'getAllRoads'>;

export class MetricsService {
  constructor(
    private readonly cityServices: CityServicesReadModel,
    private readonly publicTransport: TransportStatsProvider,
    private readonly roadNetwork: RoadNetworkView
  ) {}

  calculate(args: MetricsComputationArgs): MetricsComputationResult {
    const { citizens, buildings, currentMetrics } = args;
    const metrics: Partial<CityMetrics> = {};

    metrics.population = citizens.length;
    metrics.happiness = this.calculateHappiness(citizens);

    const trafficLevel = this.calculateTraffic();
    metrics.traffic = trafficLevel;
    metrics.pollution = this.calculatePollution(trafficLevel, buildings);

    const policeStats = this.cityServices.getServiceStats(ServiceType.POLICE);
    metrics.crime = Math.max(0, 50 - (policeStats?.coverage ?? 0) * 40);

    const educationStats = this.cityServices.getServiceStats(ServiceType.EDUCATION);
    const healthcareStats = this.cityServices.getServiceStats(ServiceType.HEALTHCARE);
    metrics.education = (educationStats?.coverage ?? 0) * 100;
    metrics.healthcare = (healthcareStats?.coverage ?? 0) * 100;

    metrics.employment = this.calculateEmployment(citizens);

    const economy = this.calculateEconomy(buildings);
    metrics.income = economy.income;
    metrics.expenses = economy.expenses;

    const budgetDelta = (economy.income - economy.expenses) * 0.001;
    const adjustedBudgetDelta = Number.isFinite(budgetDelta) ? budgetDelta : 0;
    const previousBudget = currentMetrics.budget ?? 0;
    const nextBudget = previousBudget + adjustedBudgetDelta;

    return {
      metrics,
      budgetDelta: nextBudget - previousBudget
    };
  }

  private calculateHappiness(citizens: ReadonlyArray<CityCitizen>): number {
    if (citizens.length === 0) {
      return 50;
    }

    const total = citizens.reduce((sum, citizen) => sum + (Number(citizen.satisfaction) || 50), 0);
    return total / citizens.length;
  }

  private calculateTraffic(): number {
    return 50; // Placeholder until traffic model integration
  }

  private calculatePollution(traffic: number, buildings: ReadonlyArray<CityBuilding>): number {
    let pollution = traffic * 0.1;
    for (const building of buildings) {
      if (building.type === 'industrial') {
        pollution += (Number(building.efficiency) || 0) * 0.05;
      }
    }
    return Math.min(100, pollution);
  }

  private calculateEmployment(citizens: ReadonlyArray<CityCitizen>): number {
    if (citizens.length === 0) {
      return 0;
    }

    const employed = citizens.reduce((count, citizen) => (citizen.workId ? count + 1 : count), 0);
    return (employed / citizens.length) * 100;
  }

  private calculateEconomy(buildings: ReadonlyArray<CityBuilding>): { income: number; expenses: number } {
    let income = 0;

    for (const building of buildings) {
      if (building.type === 'residential') {
        income += (Number(building.population) || 0) * 10;
      } else if (building.type === 'commercial') {
        income += (Number(building.efficiency) || 0) * 5;
      } else if (building.type === 'industrial') {
        income += (Number(building.efficiency) || 0) * 8;
      }
    }

    const transportStats = this.publicTransport.getSystemStats();
    income += transportStats.revenue ?? 0;

    const serviceStats = this.cityServices.getAllServiceStats();
    let expenses = Object.values(serviceStats).reduce((total, stats) => total + (stats?.cost ?? 0), 0);
    expenses += transportStats.operatingCost ?? 0;

    const roads = this.roadNetwork.getAllRoads?.() ?? [];
    for (const road of roads) {
      const dx = Number(road.end?.x ?? 0) - Number(road.start?.x ?? 0);
      const dy = Number(road.end?.y ?? 0) - Number(road.start?.y ?? 0);
      const length = Math.sqrt(dx * dx + dy * dy);
      expenses += length * 10;
    }

    return { income, expenses };
  }
}
