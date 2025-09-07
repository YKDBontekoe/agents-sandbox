import { CityMetrics } from './types';
import { CityServicesSystem, ServiceType } from '../cityServices';
import { PublicTransportSystem } from '../publicTransport';
import { RoadNetworkSystem } from '../roadNetwork';

interface CitizenInfo {
  satisfaction?: number;
  workId?: string;
}

interface BuildingInfo {
  type?: string;
  efficiency?: number;
  population?: number;
}

export interface MetricsContext {
  metrics: CityMetrics;
  citizens: Map<string, CitizenInfo>;
  buildings: Map<string, BuildingInfo>;
  cityServices: CityServicesSystem;
  publicTransport: PublicTransportSystem;
  roadNetwork: RoadNetworkSystem;
}

export function updateMetrics(ctx: MetricsContext): void {
  const { metrics, citizens, buildings, cityServices } = ctx;

  metrics.population = citizens.size;

  let totalSatisfaction = 0;
  citizens.forEach(citizen => {
    totalSatisfaction += citizen.satisfaction || 50;
  });
  metrics.happiness = citizens.size > 0 ? totalSatisfaction / citizens.size : 50;

  metrics.traffic = 50;

  let pollution = metrics.traffic * 0.1;
  buildings.forEach(building => {
    if (building.type === 'industrial') {
      pollution += (building.efficiency ?? 0) * 0.05;
    }
  });
  metrics.pollution = Math.min(100, pollution);

  const policeStats = cityServices.getServiceStats(ServiceType.POLICE);
  metrics.crime = Math.max(0, 50 - (policeStats?.coverage || 0) * 40);

  const educationStats = cityServices.getServiceStats(ServiceType.EDUCATION);
  const healthcareStats = cityServices.getServiceStats(ServiceType.HEALTHCARE);
  metrics.education = educationStats.coverage * 100;
  metrics.healthcare = healthcareStats.coverage * 100;

  let employed = 0;
  citizens.forEach(citizen => {
    if (citizen.workId) employed++;
  });
  metrics.employment = citizens.size > 0 ? (employed / citizens.size) * 100 : 0;

  updateBudget(ctx);
}

function updateBudget(ctx: MetricsContext): void {
  const { metrics, buildings, cityServices, publicTransport, roadNetwork } = ctx;

  let income = 0;
  buildings.forEach(building => {
    if (building.type === 'residential') {
      income += building.population * 10;
    } else if (building.type === 'commercial') {
      income += building.efficiency * 5;
    } else if (building.type === 'industrial') {
      income += building.efficiency * 8;
    }
  });

  const transportStats = publicTransport.getSystemStats();
  income += transportStats.revenue;
  metrics.income = income;

  let expenses = 0;
  const serviceStats = cityServices.getAllServiceStats();
  Object.values(serviceStats).forEach(stats => {
    expenses += stats.cost;
  });
  expenses += transportStats.operatingCost;

  const roads = roadNetwork.getAllRoads();
  const roadMaintenanceCost = roads.reduce((total, road) => {
    const length = Math.sqrt(Math.pow(road.end.x - road.start.x, 2) + Math.pow(road.end.y - road.start.y, 2));
    return total + (length * 10);
  }, 0);
  expenses += roadMaintenanceCost;

  metrics.expenses = expenses;
  metrics.budget += (income - expenses) * 0.001;
}
