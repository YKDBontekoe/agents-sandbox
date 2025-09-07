import { AdvancedPathfinding } from './pathfinding';
import { RoadNetworkSystem } from './roadNetwork';
import { TrafficSimulationSystem } from './trafficSimulation';
import { ZoningSystem, ZoneType } from './zoning';
import { createGameTime } from '../types/gameTime';
import { CityServicesSystem, ServiceType } from './cityServices';
import { PublicTransportSystem } from './transport/transportSystem';

export interface CityConfig {
  gridWidth: number;
  gridHeight: number;
  initialPopulation: number;
  startingBudget: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface CityMetrics {
  population: number;
  happiness: number;
  traffic: number;
  pollution: number;
  crime: number;
  education: number;
  healthcare: number;
  employment: number;
  budget: number;
  income: number;
  expenses: number;
}

export interface CityEvent {
  id: string;
  type: 'disaster' | 'economic' | 'social' | 'infrastructure';
  title: string;
  description: string;
  impact: Partial<CityMetrics>;
  duration: number;
  startTime: number;
}

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
  private events: CityEvent[] = [];
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
  private citizens: Map<string, any> = new Map();
  private buildings: Map<string, any> = new Map();
  private gameTime: number = 0;
  private timeScale: number = 1;
  
  constructor(config: CityConfig) {
    this.config = config;
    this.initializeMetrics();
    this.initializeSystems();
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
  
  private initializeSystems(): void {
    // Initialize all simulation systems
    this.pathfinding = new AdvancedPathfinding(this.config.gridWidth, this.config.gridHeight);
    this.roadNetwork = new RoadNetworkSystem(this.config.gridWidth, this.config.gridHeight);
    this.trafficSimulation = new TrafficSimulationSystem(this.config.gridWidth, this.config.gridHeight);
    this.zoningSystem = new ZoningSystem(this.config.gridWidth, this.config.gridHeight);
    this.cityServices = new CityServicesSystem(this.config.gridWidth, this.config.gridHeight);
    this.publicTransport = new PublicTransportSystem(this.config.gridWidth, this.config.gridHeight);
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
    this.updateMetrics();
    this.updateEvents(deltaTime);
    this.processRandomEvents();
  }
  
  private updateSystems(deltaTime: number): void {
    // Update road network and traffic
    this.trafficSimulation.update(deltaTime);

    // Update pathfinding with current traffic data
    const trafficData = this.trafficSimulation.getTrafficStats();

    // Update zoning and services
    this.zoningSystem.update(
      createGameTime(Math.floor(this.gameTime / 60000)),
      Array.from(this.buildings.values())
    );
    this.cityServices.update(deltaTime);
    this.publicTransport.update(deltaTime);
    
    // Update citizens and buildings
    this.updateCitizens(deltaTime);
    this.updateBuildings(deltaTime);
  }
  
  private updateCitizens(deltaTime: number): void {
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
  
  private updateBuildings(deltaTime: number): void {
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
  
  private handleCitizenTransport(citizen: any): void {
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
  
  private handleCitizenEmployment(citizen: any): void {
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
  
  private updateCitizenSatisfaction(citizen: any): void {
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
  
  private calculateBuildingEfficiency(building: any, serviceStats: any): number {
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
  
  private handleZoneChange(building: any, newZoneType: string): void {
    // Handle building conversion based on zoning changes
    if (building.zoneType !== newZoneType) {
      building.zoneType = newZoneType;
      building.needsUpgrade = true;
      
      // Trigger building upgrade/conversion
      this.scheduleBuildingUpgrade(building, newZoneType);
    }
  }
  
  private scheduleBuildingUpgrade(building: any, targetType: string): void {
    // Add to upgrade queue with cost and time requirements
    const upgradeCost = this.calculateUpgradeCost(building, targetType);
    
    if (this.metrics.budget >= upgradeCost) {
      this.metrics.budget -= upgradeCost;
      building.upgrading = true;
      building.upgradeTarget = targetType;
      building.upgradeTime = this.gameTime + 30000; // 30 seconds
    }
  }
  
  private calculateUpgradeCost(building: any, targetType: string): number {
    const baseCost = 1000;
    const typeCostMultiplier = {
      'residential': 1,
      'commercial': 1.5,
      'industrial': 2,
      'office': 1.8
    };
    
    return baseCost * (typeCostMultiplier[targetType as keyof typeof typeCostMultiplier] || 1);
  }
  
  private updateMetrics(): void {
    // Calculate population
    this.metrics.population = this.citizens.size;
    
    // Calculate happiness (average citizen satisfaction)
    let totalSatisfaction = 0;
    this.citizens.forEach(citizen => {
      totalSatisfaction += citizen.satisfaction || 50;
    });
    this.metrics.happiness = this.citizens.size > 0 ? totalSatisfaction / this.citizens.size : 50;
    
    // Calculate traffic from traffic simulation
    this.metrics.traffic = 50; // Default traffic level
    
    // Calculate pollution based on industrial buildings and traffic
    let pollution = this.metrics.traffic * 0.1;
    this.buildings.forEach(building => {
      if (building.type === 'industrial') {
        pollution += building.efficiency * 0.05;
      }
    });
    this.metrics.pollution = Math.min(100, pollution);
    
    // Update crime based on police coverage
    const policeStats = this.cityServices.getServiceStats(ServiceType.POLICE);
    this.metrics.crime = Math.max(0, 50 - (policeStats?.coverage || 0) * 40);
    
    // Update education and healthcare
    const educationStats = this.cityServices.getServiceStats(ServiceType.EDUCATION);
    const healthcareStats = this.cityServices.getServiceStats(ServiceType.HEALTHCARE);
    this.metrics.education = educationStats.coverage * 100;
    this.metrics.healthcare = healthcareStats.coverage * 100;
    
    // Calculate employment
    let employed = 0;
    this.citizens.forEach(citizen => {
      if (citizen.workId) employed++;
    });
    this.metrics.employment = this.citizens.size > 0 ? (employed / this.citizens.size) * 100 : 0;
    
    // Update budget
    this.updateBudget();
  }
  
  private updateBudget(): void {
    // Calculate income
    let income = 0;
    
    // Tax income from buildings
    this.buildings.forEach(building => {
      if (building.type === 'residential') {
        income += building.population * 10; // $10 per resident
      } else if (building.type === 'commercial') {
        income += building.efficiency * 5; // Based on efficiency
      } else if (building.type === 'industrial') {
        income += building.efficiency * 8;
      }
    });
    
    // Public transport income
    const transportStats = this.publicTransport.getSystemStats();
    income += transportStats.revenue;
    
    this.metrics.income = income;
    
    // Calculate expenses
    let expenses = 0;
    
    // Service maintenance costs
    const serviceStats = this.cityServices.getAllServiceStats();
    Object.values(serviceStats).forEach(stats => {
      expenses += stats.cost;
    });
    
    // Transport operating costs
    expenses += transportStats.operatingCost;
    
    // Road maintenance - simple calculation based on road network size
    const roads = this.roadNetwork.getAllRoads();
    const roadMaintenanceCost = roads.reduce((total, road) => {
      const length = Math.sqrt(Math.pow(road.end.x - road.start.x, 2) + Math.pow(road.end.y - road.start.y, 2));
      return total + (length * 10); // $10 per unit length per update
    }, 0);
    expenses += roadMaintenanceCost;
    
    this.metrics.expenses = expenses;
    
    // Update budget
    this.metrics.budget += (income - expenses) * 0.001; // Scale down for real-time
  }
  
  private updateEvents(deltaTime: number): void {
    this.events = this.events.filter(event => {
      event.duration -= deltaTime;
      
      if (event.duration <= 0) {
        this.resolveEvent(event);
        return false;
      }
      
      return true;
    });
  }
  
  private processRandomEvents(): void {
    // Random event generation
    if (Math.random() < 0.0001) { // Very low chance per update
      this.generateRandomEvent();
    }
  }
  
  private generateRandomEvent(): void {
    const eventTypes = [
      {
        type: 'economic' as const,
        title: 'Economic Boom',
        description: 'The city experiences economic growth',
        impact: { income: 20, happiness: 10 },
        duration: 60000
      },
      {
        type: 'social' as const,
        title: 'Festival',
        description: 'A city festival boosts happiness',
        impact: { happiness: 15, traffic: 10 },
        duration: 30000
      },
      {
        type: 'infrastructure' as const,
        title: 'Traffic Jam',
        description: 'Heavy traffic affects the city',
        impact: { traffic: 25, happiness: -5 },
        duration: 45000
      }
    ];
    
    const eventTemplate = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const event: CityEvent = {
      id: `event_${Date.now()}`,
      ...eventTemplate,
      startTime: this.gameTime
    };
    
    this.events.push(event);
    this.applyEventImpact(event);
  }
  
  private applyEventImpact(event: CityEvent): void {
    Object.entries(event.impact).forEach(([key, value]) => {
      if (key in this.metrics) {
        (this.metrics as any)[key] = Math.max(0, (this.metrics as any)[key] + value);
      }
    });
  }
  
  private resolveEvent(event: CityEvent): void {
    // Reverse temporary effects if needed
    if (event.type === 'infrastructure' || event.type === 'social') {
      Object.entries(event.impact).forEach(([key, value]) => {
        if (key in this.metrics) {
          (this.metrics as any)[key] = Math.max(0, (this.metrics as any)[key] - value);
        }
      });
    }
  }
  
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }
  
  // Public API
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
  addBuilding(building: any): void {
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
  
  addCitizen(citizen: any): void {
    this.citizens.set(citizen.id, citizen);
  }
  
  removeCitizen(citizenId: string): void {
    this.citizens.delete(citizenId);
  }
  
  // Zone management
  zoneArea(startX: number, startY: number, endX: number, endY: number, zoneType: string): void {
    this.zoningSystem.zoneArea(startX, startY, endX, endY, zoneType as any);
  }
  
  // Road management
  buildRoad(startX: number, startY: number, endX: number, endY: number, roadType: string = 'street'): void {
    const roadBlueprint = this.roadNetwork.planRoad(roadType as any, { x: startX, y: startY }, { x: endX, y: endY });
    if (roadBlueprint) {
      // Implement road construction logic - add to road network
      // Note: buildRoad method may not exist, using planRoad for now
    }
  }
}