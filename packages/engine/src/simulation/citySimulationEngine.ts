import { AdvancedPathfinding, RoadType } from './pathfinding';
import { RoadNetworkSystem } from './roadNetwork';
import { TrafficSimulationSystem } from './trafficSimulation';
import { ZoningSystem, ZoneType } from './zoningSystem';
import { CityServicesSystem } from './cityServices';
import { PublicTransportSystem } from './publicTransport';
import { CityConfig, CityMetrics } from './city/types';
import { initSystems } from './city/initSystems';
import { EventManager, CityEvent } from './city/events';
import { updateMetrics } from './city/metrics';

interface Citizen {
  id: string;
  homeId?: string;
  workId?: string;
  needsTransport?: boolean;
  needsWork?: boolean;
  homePosition: { x: number; y: number };
  workPosition: { x: number; y: number };
  transportMode?: string;
  satisfaction?: number;
  path?: Array<{ x: number; y: number }>;
}

interface Building {
  id: string;
  x: number;
  y: number;
  type: string;
  zoneType?: string;
  serviceType?: string;
  efficiency: number;
  baseEfficiency?: number;
  needsUpgrade?: boolean;
  upgrading?: boolean;
  upgradeTarget?: string;
  upgradeTime?: number;
  population?: number;
}

interface ServiceStat {
  coverage?: number;
  satisfaction?: number;
}

type ServiceStats = Record<string, ServiceStat>;

export class CitySimulationEngine {
  private config: CityConfig;
  private metrics: CityMetrics = {
    population: 0,
    happiness: 50,
    traffic: 0,
    pollution: 0,
    crime: 10,
    education: 30,
    healthcare: 30,
    employment: 70,
    budget: 0,
    income: 0,
    expenses: 0
  };
  private eventManager!: EventManager;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 16; // ~60 FPS
  
  // Core systems
  private pathfinding!: AdvancedPathfinding;
  private roadNetwork!: RoadNetworkSystem;
  private trafficSimulation!: TrafficSimulationSystem;
  private zoningSystem!: ZoningSystem;
  private cityServices!: CityServicesSystem;
  private publicTransport!: PublicTransportSystem;
  
  // Simulation state
  private citizens: Map<string, Citizen> = new Map();
  private buildings: Map<string, Building> = new Map();
  private gameTime: number = 0;
  private timeScale: number = 1;

  constructor(config: CityConfig) {
    this.config = config;
    this.initializeMetrics();
    const systems = initSystems(this.config);
    this.pathfinding = systems.pathfinding;
    this.roadNetwork = systems.roadNetwork;
    this.trafficSimulation = systems.trafficSimulation;
    this.zoningSystem = systems.zoningSystem;
    this.cityServices = systems.cityServices;
    this.publicTransport = systems.publicTransport;
    this.eventManager = new EventManager(this.metrics, () => this.gameTime);
  }
  
  private initializeMetrics(): void {
    this.metrics = {
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
  
  
  // Main simulation loop
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

    // Update all systems
    this.updateSystems(deltaTime);
    updateMetrics({
      metrics: this.metrics,
      citizens: this.citizens,
      buildings: this.buildings,
      cityServices: this.cityServices,
      publicTransport: this.publicTransport,
      roadNetwork: this.roadNetwork
    });
    this.eventManager.update(deltaTime);
    this.eventManager.processRandomEvents();
  }
  
  private updateSystems(deltaTime: number): void {
    // Update road network and traffic
    this.trafficSimulation.update(deltaTime);

    // Update zoning and services
    this.cityServices.update(deltaTime);
    this.publicTransport.update(deltaTime);
    
    // Update citizens and buildings
    this.updateCitizens();
    this.updateBuildings();
  }

  private updateCitizens(): void {
    this.citizens.forEach(citizen => {
      // Update citizen behavior based on city state
      if (citizen.needsTransport) {
        this.handleCitizenTransport(citizen);
      }
      
      if (citizen.needsWork) {
        this.handleCitizenEmployment(citizen);
      }
      
      // Update citizen satisfaction based on services
      this.updateCitizenSatisfaction(citizen);
    });
  }
  
  private updateBuildings(): void {
    this.buildings.forEach(building => {
      // Update building efficiency based on services
      const serviceStats = this.cityServices.getAllServiceStats();
      building.efficiency = this.calculateBuildingEfficiency(building, serviceStats);
      
      // Update building based on zoning
      const zone = this.zoningSystem.getZoneAt(building.x, building.y);
      if (zone && zone.type !== building.zoneType) {
        this.handleZoneChange(building, zone.type);
      }
    });
  }
  
  private handleCitizenTransport(citizen: Citizen): void {
    const origin = citizen.homeId;
    const destination = citizen.workId;
    
    if (!origin || !destination) return;
    
    // Try public transport first
    const publicRoute = this.publicTransport.findRoute(origin, destination);
    if (publicRoute) {
      this.publicTransport.addPassenger(citizen.id, origin, destination);
      citizen.transportMode = 'public';
    } else {
      // Use private transport (car)
      const pathResult = this.pathfinding.findPath({
        start: { x: citizen.homePosition.x, y: citizen.homePosition.y },
        end: { x: citizen.workPosition.x, y: citizen.workPosition.y },
        entityType: 'vehicle',
        priority: 50,
        avoidTraffic: true,
        allowedRoadTypes: ['residential', 'commercial', 'highway', 'intersection']
      });
      
      if (pathResult.success) {
        citizen.path = pathResult.path;
        citizen.transportMode = 'private';
        // Add to traffic simulation
        this.trafficSimulation.spawnVehicle(
          'car',
          citizen.homePosition,
          citizen.workPosition,
          50
        );
      }
    }
  }
  
  private handleCitizenEmployment(citizen: Citizen): void {
    // Find available jobs in zoned areas
    const commercialZones = this.zoningSystem.getZonesByType('commercial');
    const industrialZones = this.zoningSystem.getZonesByType('industrial');
    
    const availableJobs = [...commercialZones, ...industrialZones]
      .sort((a, b) => {
        const distA = this.calculateDistance(citizen.homePosition, { x: a.x, y: a.y });
        const distB = this.calculateDistance(citizen.homePosition, { x: b.x, y: b.y });
        return distA - distB;
      });
    
    if (availableJobs.length > 0) {
      const job = availableJobs[0];
      citizen.workId = `${job.x}_${job.y}`;
      citizen.workPosition = { x: job.x, y: job.y };
      citizen.needsWork = false;
    }
  }
  
  private updateCitizenSatisfaction(citizen: Citizen): void {
    const services = this.cityServices.getAllServiceStats();
    const transport = this.publicTransport.getSystemStats();
    
    let satisfaction = 50; // Base satisfaction
    
    // Service quality impact
    satisfaction += (services.police?.satisfaction || 0) * 0.2;
    satisfaction += (services.healthcare?.satisfaction || 0) * 0.3;
    satisfaction += (services.education?.satisfaction || 0) * 0.2;
    satisfaction += (services.parks?.satisfaction || 0) * 0.1;
    
    // Transport quality impact
    satisfaction += (100 - transport.averageWaitTime) * 0.1;
    satisfaction -= this.metrics.traffic * 0.1;
    
    // Pollution and crime impact
    satisfaction -= this.metrics.pollution * 0.2;
    satisfaction -= this.metrics.crime * 0.15;
    
    citizen.satisfaction = Math.max(0, Math.min(100, satisfaction));
  }
  
  private calculateBuildingEfficiency(building: Building, serviceStats: ServiceStats): number {
    let efficiency = building.baseEfficiency || 80;
    
    // Service coverage impact
    if (building.type === 'commercial') {
      efficiency *= (serviceStats.police?.coverage || 0.5);
      efficiency *= (1 - this.metrics.crime / 200);
    } else if (building.type === 'industrial') {
      efficiency *= (serviceStats.power?.coverage || 0.5);
      efficiency *= (serviceStats.water?.coverage || 0.5);
    } else if (building.type === 'residential') {
      efficiency *= (serviceStats.healthcare?.coverage || 0.5);
      efficiency *= (serviceStats.education?.coverage || 0.5);
    }
    
    // Traffic impact
    const trafficImpact = Math.max(0.5, 1 - this.metrics.traffic / 200);
    efficiency *= trafficImpact;
    
    return Math.max(10, Math.min(100, efficiency));
  }
  
  private handleZoneChange(building: Building, newZoneType: string): void {
    // Handle building conversion based on zoning changes
    if (building.zoneType !== newZoneType) {
      building.zoneType = newZoneType;
      building.needsUpgrade = true;
      
      // Trigger building upgrade/conversion
      this.scheduleBuildingUpgrade(building, newZoneType);
    }
  }
  
  private scheduleBuildingUpgrade(building: Building, targetType: string): void {
    // Add to upgrade queue with cost and time requirements
    const upgradeCost = this.calculateUpgradeCost(building, targetType);
    
    if (this.metrics.budget >= upgradeCost) {
      this.metrics.budget -= upgradeCost;
      building.upgrading = true;
      building.upgradeTarget = targetType;
      building.upgradeTime = this.gameTime + 30000; // 30 seconds
    }
  }
  
  private calculateUpgradeCost(building: Building, targetType: string): number {
    const baseCost = 1000;
    const typeCostMultiplier = {
      'residential': 1,
      'commercial': 1.5,
      'industrial': 2,
      'office': 1.8
    };
    
    return baseCost * (typeCostMultiplier[targetType as keyof typeof typeCostMultiplier] || 1);
  }
  
  
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
  
  // Public API
  getMetrics(): CityMetrics {
    return { ...this.metrics };
  }
  
  getEvents(): CityEvent[] {
    return this.eventManager.getEvents();
  }
  
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(10, scale));
  }
  
  getTimeScale(): number {
    return this.timeScale;
  }
  
  // System access
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
  
  // Building and citizen management
  addBuilding(building: Building): void {
    this.buildings.set(building.id, building);
    
    // Add to appropriate systems
    if (building.serviceType) {
      this.cityServices.addServiceBuilding(building);
    }
  }
  
  removeBuilding(buildingId: string): void {
    this.buildings.delete(buildingId);
    this.cityServices.removeServiceBuilding(buildingId);
  }
  
  addCitizen(citizen: Citizen): void {
    this.citizens.set(citizen.id, citizen);
  }
  
  removeCitizen(citizenId: string): void {
    this.citizens.delete(citizenId);
  }
  
  // Zone management
  zoneArea(startX: number, startY: number, endX: number, endY: number, zoneType: string): void {
    this.zoningSystem.zoneArea(startX, startY, endX, endY, zoneType as ZoneType);
  }
  
  // Road management
  buildRoad(startX: number, startY: number, endX: number, endY: number, roadType: string = 'street'): void {
    const roadBlueprint = this.roadNetwork.planRoad(roadType as RoadType, { x: startX, y: startY }, { x: endX, y: endY });
    if (roadBlueprint) {
      // Implement road construction logic - add to road network
      // Note: buildRoad method may not exist, using planRoad for now
    }
  }
}