import { AdvancedPathfinding } from '../pathfinding';
import { RoadNetworkSystem } from '../roadNetwork';
import { TrafficSimulationSystem } from '../trafficSimulation';
import { ZoningSystem } from '../zoning';
import { createGameTime } from '../../types/gameTime';
import { CityServicesSystem } from '../cityServices';
import { PublicTransportSystem } from '../transport/transportSystem';
import type { CityEvent, CityMetrics, CityConfig, CityCitizen, CityBuilding, CityMetricDelta } from './types';
import { CitizenManager, type CitizenUpdate } from './citizenManager';
import { BuildingManager, type BuildingDelta } from './buildingManager';
import { MetricsService } from './metricsService';
import { EventScheduler } from './eventScheduler';

export class CitySimulationEngine {
  private readonly config: CityConfig;
  private metrics: CityMetrics;
  private events: CityEvent[] = [];
  private isRunning = false;
  private lastUpdateTime = 0;
  private readonly updateInterval = 16;

  private pathfinding!: AdvancedPathfinding;
  private roadNetwork!: RoadNetworkSystem;
  private trafficSimulation!: TrafficSimulationSystem;
  private zoningSystem!: ZoningSystem;
  private cityServices!: CityServicesSystem;
  private publicTransport!: PublicTransportSystem;

  private citizenManager!: CitizenManager;
  private buildingManager!: BuildingManager;
  private metricsService!: MetricsService;
  private eventScheduler!: EventScheduler;

  private readonly citizens: Map<string, CityCitizen> = new Map();
  private readonly buildings: Map<string, CityBuilding> = new Map();
  private gameTime = 0;
  private timeScale = 1;

  constructor(config: CityConfig) {
    this.config = config;
    this.metrics = this.createInitialMetrics();
    this.initializeSystems();
  }

  private createInitialMetrics(): CityMetrics {
    return {
      population: this.config.initialPopulation,
      happiness: 50,
      traffic: 0,
      pollution: 0,
      crime: 10,
      education: 30,
      healthcare: 30,
      employment: 70,
      budget: this.config.startingBudget,
      income: 0,
      expenses: 0
    };
  }

  private initializeSystems(): void {
    this.pathfinding = new AdvancedPathfinding(this.config.gridWidth, this.config.gridHeight);
    this.roadNetwork = new RoadNetworkSystem(this.config.gridWidth, this.config.gridHeight);
    this.trafficSimulation = new TrafficSimulationSystem(this.config.gridWidth, this.config.gridHeight);
    this.zoningSystem = new ZoningSystem(this.config.gridWidth, this.config.gridHeight);
    this.cityServices = new CityServicesSystem(this.config.gridWidth, this.config.gridHeight);
    this.publicTransport = new PublicTransportSystem(this.config.gridWidth, this.config.gridHeight);

    this.citizenManager = new CitizenManager(
      this.pathfinding,
      this.publicTransport,
      this.trafficSimulation,
      this.zoningSystem,
      this.cityServices
    );
    this.buildingManager = new BuildingManager(this.cityServices, this.zoningSystem);
    this.metricsService = new MetricsService(this.cityServices, this.publicTransport, this.roadNetwork);
    this.eventScheduler = new EventScheduler();
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    this.gameLoop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) * this.timeScale;
    this.lastUpdateTime = currentTime;

    this.update(deltaTime);

    setTimeout(() => this.gameLoop(), this.updateInterval);
  }

  private update(deltaTime: number): void {
    this.gameTime += deltaTime;

    this.updateCoreSystems(deltaTime);

    const citizens = Array.from(this.citizens.values());
    const buildings = Array.from(this.buildings.values());

    const citizenUpdates = this.citizenManager.evaluateCitizens(citizens, {
      traffic: this.metrics.traffic,
      pollution: this.metrics.pollution,
      crime: this.metrics.crime
    });
    this.applyCitizenUpdates(citizenUpdates);

    const buildingResult = this.buildingManager.evaluateBuildings(
      buildings,
      { traffic: this.metrics.traffic, crime: this.metrics.crime },
      this.gameTime,
      this.metrics.budget
    );
    this.applyBuildingUpdates(buildingResult.updates);

    const metricsResult = this.metricsService.calculate({
      citizens,
      buildings,
      currentMetrics: this.metrics
    });
    Object.assign(this.metrics, metricsResult.metrics);

    const totalBudgetDelta = buildingResult.budgetDelta + metricsResult.budgetDelta;

    const eventResult = this.eventScheduler.advance({
      events: this.events,
      deltaTime,
      currentTime: this.gameTime
    });
    this.events = eventResult.events;
    this.applyMetricDelta(eventResult.metricDelta);

    if (totalBudgetDelta !== 0) {
      this.metrics.budget = Math.max(0, this.metrics.budget + totalBudgetDelta);
    }
  }

  private updateCoreSystems(deltaTime: number): void {
    this.trafficSimulation.update(deltaTime);

    this.zoningSystem.update(
      createGameTime(Math.floor(this.gameTime / 60000)),
      Array.from(this.buildings.values()) as any
    );
    this.cityServices.update(deltaTime);
    this.publicTransport.update(deltaTime);
  }

  private applyCitizenUpdates(updates: ReadonlyArray<CitizenUpdate>): void {
    for (const update of updates) {
      const citizen = this.citizens.get(update.id);
      if (!citizen) continue;
      Object.assign(citizen, update.changes);
    }
  }

  private applyBuildingUpdates(updates: ReadonlyArray<BuildingDelta>): void {
    for (const update of updates) {
      const building = this.buildings.get(update.id);
      if (!building) continue;
      Object.assign(building, update.changes);
    }
  }

  private applyMetricDelta(delta: CityMetricDelta): void {
    for (const [key, value] of Object.entries(delta)) {
      if (typeof value !== 'number') continue;
      const metricKey = key as keyof CityMetrics;
      const currentValue = this.metrics[metricKey] ?? 0;
      this.metrics[metricKey] = Math.max(0, currentValue + value);
    }
  }

  getMetrics(): CityMetrics {
    return { ...this.metrics };
  }

  getEvents(): CityEvent[] {
    return [...this.events];
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(10, scale));
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  getPathfinding(): AdvancedPathfinding {
    return this.pathfinding;
  }

  getRoadNetwork(): RoadNetworkSystem {
    return this.roadNetwork;
  }

  getTrafficSimulation(): TrafficSimulationSystem {
    return this.trafficSimulation;
  }

  getZoningSystem(): ZoningSystem {
    return this.zoningSystem;
  }

  getCityServices(): CityServicesSystem {
    return this.cityServices;
  }

  getPublicTransport(): PublicTransportSystem {
    return this.publicTransport;
  }

  addBuilding(building: CityBuilding): void {
    this.buildings.set(building.id, building);

    if (building.serviceType) {
      this.cityServices.addServiceBuilding(building as any);
    }
  }

  removeBuilding(buildingId: string): void {
    this.buildings.delete(buildingId);
    this.cityServices.removeServiceBuilding(buildingId);
  }

  addCitizen(citizen: CityCitizen): void {
    this.citizens.set(citizen.id, citizen);
  }

  removeCitizen(citizenId: string): void {
    this.citizens.delete(citizenId);
  }

  zoneArea(startX: number, startY: number, endX: number, endY: number, zoneType: string): void {
    this.zoningSystem.zoneArea(startX, startY, endX, endY, zoneType as any);
  }

  buildRoad(startX: number, startY: number, endX: number, endY: number, roadType: string = 'street'): void {
    const roadBlueprint = this.roadNetwork.planRoad(roadType as any, { x: startX, y: startY }, { x: endX, y: endY });
    if (roadBlueprint) {
      // Road construction hook - retained for future implementation
    }
  }
}
