import type { GameTime } from '../types/gameTime';
import { AdvancedPathfinding } from './pathfinding';
import { RoadNetworkSystem } from './roadNetwork';
import { TrafficSimulationSystem } from './trafficSimulation';
import { ZoningSystem, ZoneType } from './zoning';
import { CityServicesSystem, ServiceType } from './cityServices';
import { PublicTransportSystem } from './publicTransport';

export interface CityManagementConfig {
  gridWidth: number;
  gridHeight: number;
  initialBudget: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface CityStats {
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

export interface ManagementAction {
  type: 'zone' | 'build_road' | 'build_service' | 'demolish' | 'upgrade';
  position: { x: number; y: number };
  data: any;
  cost: number;
}

export class CityManagementInterface {
  private config: CityManagementConfig;
  private stats: CityStats;
  private actions: ManagementAction[] = [];
  
  // Core systems
  private pathfinding: AdvancedPathfinding;
  private roadNetwork: RoadNetworkSystem;
  private trafficSimulation: TrafficSimulationSystem;
  private zoningSystem: ZoningSystem;
  private cityServices: CityServicesSystem;
  private publicTransport: PublicTransportSystem;
  
  // Management state
  private selectedTool: string = 'select';
  private selectedZoneType: ZoneType = 'residential';
  private selectedServiceType: ServiceType = ServiceType.POLICE;
  private budget: number;
  private isSimulationRunning: boolean = false;
  
  constructor(config: CityManagementConfig) {
    this.config = config;
    this.budget = config.initialBudget;
    
    // Initialize stats
    this.stats = {
      population: 0,
      happiness: 50,
      traffic: 0,
      pollution: 0,
      crime: 10,
      education: 30,
      healthcare: 30,
      employment: 70,
      budget: this.budget,
      income: 0,
      expenses: 0
    };
    
    // Initialize systems
    this.pathfinding = new AdvancedPathfinding(config.gridWidth, config.gridHeight);
    this.roadNetwork = new RoadNetworkSystem(config.gridWidth, config.gridHeight);
    this.trafficSimulation = new TrafficSimulationSystem(config.gridWidth, config.gridHeight);
    this.zoningSystem = new ZoningSystem(config.gridWidth, config.gridHeight);
    this.cityServices = new CityServicesSystem(config.gridWidth, config.gridHeight);
    this.publicTransport = new PublicTransportSystem(config.gridWidth, config.gridHeight);
  }
  
  // Simulation control
  startSimulation(): void {
    this.isSimulationRunning = true;
  }
  
  pauseSimulation(): void {
    this.isSimulationRunning = false;
  }
  
  update(deltaTime: number, gameTime: GameTime): void {
    if (!this.isSimulationRunning) return;
    
    // Update all systems
    this.trafficSimulation.update(deltaTime);
    this.zoningSystem.update(gameTime, []);
    this.cityServices.update(deltaTime);
    this.publicTransport.update(deltaTime);
    
    // Update stats
    this.updateStats();
    
    // Process pending actions
    this.processActions();
  }
  
  private updateStats(): void {
    // Update population from zoning
    const residentialZones = this.zoningSystem.getZonesByType('residential');
    this.stats.population = residentialZones.length * 10; // Rough estimate
    
    // Update budget
    this.stats.budget = this.budget;
    
    // Calculate income from taxes
    this.stats.income = this.stats.population * 5; // $5 per citizen per update
    
    // Calculate expenses from services
    const serviceBuildings = this.cityServices.getServiceBuildings();
    this.stats.expenses = serviceBuildings.length * 10; // $10 per service building
    
    // Update budget
    this.budget += this.stats.income - this.stats.expenses;
    this.stats.budget = this.budget;
    
    // Update other metrics
    this.stats.happiness = this.calculateHappiness();
    this.stats.traffic = this.calculateTrafficLevel();
    this.stats.pollution = this.calculatePollutionLevel();
  }
  
  private calculateHappiness(): number {
    const zones = this.zoningSystem.getAllZones();
    if (zones.length === 0) return 50;
    
    const totalHappiness = zones.reduce((sum, zone) => sum + zone.happiness, 0);
    return totalHappiness / zones.length;
  }
  
  private calculateTrafficLevel(): number {
    // Simple traffic calculation based on vehicle count
    const vehicles = this.trafficSimulation.getAllVehicles();
    return Math.min(100, vehicles.length * 2);
  }
  
  private calculatePollutionLevel(): number {
    const industrialZones = this.zoningSystem.getZonesByType('industrial');
    return Math.min(100, industrialZones.length * 5);
  }
  
  private processActions(): void {
    for (const action of this.actions) {
      if (this.budget >= action.cost) {
        this.executeAction(action);
        this.budget -= action.cost;
      }
    }
    this.actions = [];
  }
  
  private executeAction(action: ManagementAction): void {
    switch (action.type) {
      case 'zone':
        this.zoningSystem.zoneArea(
          action.position.x, action.position.y,
          action.position.x, action.position.y,
          action.data.zoneType
        );
        break;
        
      case 'build_road':
        this.roadNetwork.planRoad(
          action.data.roadType as any,
          action.position,
          action.data.endPosition
        );
        break;
        
      case 'build_service':
        this.cityServices.addServiceBuilding({
          id: `service_${Date.now()}`,
          typeId: action.data.serviceType,
          position: action.position,
          x: action.position.x,
          y: action.position.y,
          serviceType: action.data.serviceType,
          capacity: 100,
          currentLoad: 0,
          efficiency: 1.0,
          maintenanceCost: 100,
          coverage: 10,
          staffing: 5,
          maxStaffing: 10
        });
        break;
    }
  }
  
  // Public interface methods
  setSelectedTool(tool: string): void {
    this.selectedTool = tool;
  }
  
  setSelectedZoneType(zoneType: ZoneType): void {
    this.selectedZoneType = zoneType;
  }
  
  setSelectedServiceType(serviceType: ServiceType): void {
    this.selectedServiceType = serviceType;
  }
  
  // Zone management
  zoneArea(startX: number, startY: number, endX: number, endY: number): boolean {
    const cost = this.calculateZoneCost(startX, startY, endX, endY);
    
    if (this.budget < cost) return false;
    
    this.actions.push({
      type: 'zone',
      position: { x: startX, y: startY },
      data: { 
        endX, endY, 
        zoneType: this.selectedZoneType 
      },
      cost
    });
    
    return true;
  }
  
  // Road management
  buildRoad(startX: number, startY: number, endX: number, endY: number, roadType: string = 'residential'): boolean {
    const cost = this.calculateRoadCost(startX, startY, endX, endY, roadType);
    
    if (this.budget < cost) return false;
    
    this.actions.push({
      type: 'build_road',
      position: { x: startX, y: startY },
      data: { 
        endPosition: { x: endX, y: endY },
        roadType 
      },
      cost
    });
    
    return true;
  }
  
  // Service management
  buildService(x: number, y: number): boolean {
    const cost = this.calculateServiceCost(this.selectedServiceType);
    
    if (this.budget < cost) return false;
    
    this.actions.push({
      type: 'build_service',
      position: { x, y },
      data: { serviceType: this.selectedServiceType },
      cost
    });
    
    return true;
  }
  
  // Cost calculations
  private calculateZoneCost(startX: number, startY: number, endX: number, endY: number): number {
    const area = Math.abs(endX - startX + 1) * Math.abs(endY - startY + 1);
    return area * 100; // $100 per cell
  }
  
  private calculateRoadCost(startX: number, startY: number, endX: number, endY: number, roadType: string): number {
    const distance = Math.abs(endX - startX) + Math.abs(endY - startY);
    const baseCost = roadType === 'highway' ? 500 : roadType === 'commercial' ? 300 : 200;
    return distance * baseCost;
  }
  
  private calculateServiceCost(serviceType: ServiceType): number {
    switch (serviceType) {
      case ServiceType.POLICE: return 5000;
      case ServiceType.FIRE: return 7000;
      case ServiceType.HEALTHCARE: return 10000;
      case ServiceType.EDUCATION: return 8000;
      case ServiceType.POWER: return 15000;
      case ServiceType.WATER: return 12000;
      case ServiceType.WASTE: return 6000;
      default: return 5000;
    }
  }
  
  // Getters
  getStats(): CityStats {
    return { ...this.stats };
  }
  
  getBudget(): number {
    return this.budget;
  }
  
  getSelectedTool(): string {
    return this.selectedTool;
  }
  
  getSelectedZoneType(): ZoneType {
    return this.selectedZoneType;
  }
  
  getSelectedServiceType(): ServiceType {
    return this.selectedServiceType;
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
  
  // Simulation queries
  getZoneAt(x: number, y: number) {
    return this.zoningSystem.getZoneAt(x, y);
  }
  
  getRoadAt(x: number, y: number) {
    return this.roadNetwork.getRoadAt(x, y);
  }
  
  getServiceBuildingsInRange(x: number, y: number, range: number) {
    return this.cityServices.getServiceBuildings().filter(building => {
      const distance = Math.sqrt(
        Math.pow(building.x - x, 2) + Math.pow(building.y - y, 2)
      );
      return distance <= range;
    });
  }
  
  // Spawn entities for testing
  spawnVehicle(start: { x: number; y: number }, destination: { x: number; y: number }): string {
    return this.trafficSimulation.spawnVehicle('car', start, destination);
  }
  
  spawnPedestrian(start: { x: number; y: number }, destination: { x: number; y: number }): string {
    return this.trafficSimulation.spawnPedestrian(start, destination);
  }
}

// Export singleton instance for easy use
export const cityManagement = new CityManagementInterface({
  gridWidth: 200,
  gridHeight: 200,
  initialBudget: 100000,
  difficulty: 'normal'
});