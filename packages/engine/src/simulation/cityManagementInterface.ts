import type { GameTime } from '../types/gameTime';
import { AdvancedPathfinding } from './pathfinding';
import { RoadNetworkSystem } from './roadNetwork';
import { TrafficSimulationSystem } from './trafficSimulation';
import { ZoningSystem, ZoneType } from './zoning';
import { CityServicesSystem, ServiceType } from './cityServices';
import { PublicTransportSystem } from './transport/transportSystem';
import { CityManagementState } from './cityManagement/CityManagementState';
import {
  type CityActionContext,
  type ManagementAction,
  createRoadAction,
  createServiceAction,
  createZoneAction,
  executeCityAction,
  processCityActions
} from './cityManagement/cityActions';

export interface CityManagementConfig {
  gridWidth: number;
  gridHeight: number;
  initialBudget: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export class CityManagementInterface {
  private config: CityManagementConfig;
  private state: CityManagementState;
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
  private isSimulationRunning: boolean = false;

  constructor(config: CityManagementConfig) {
    this.config = config;
    this.state = new CityManagementState(config.initialBudget);

    this.pathfinding = new AdvancedPathfinding(config.gridWidth, config.gridHeight);
    this.roadNetwork = new RoadNetworkSystem(config.gridWidth, config.gridHeight);
    this.trafficSimulation = new TrafficSimulationSystem(config.gridWidth, config.gridHeight);
    this.zoningSystem = new ZoningSystem(config.gridWidth, config.gridHeight);
    this.cityServices = new CityServicesSystem(config.gridWidth, config.gridHeight);
    this.publicTransport = new PublicTransportSystem(config.gridWidth, config.gridHeight);
  }

  async initialize(): Promise<void> {
    this.syncPopulationAndMetrics();
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

    this.trafficSimulation.update(deltaTime);
    this.zoningSystem.update(gameTime, []);
    this.cityServices.update(deltaTime);
    this.publicTransport.update(deltaTime);

    this.state.resetFlow();
    processCityActions(this.actions, this.getActionContext(), this.state);
    this.actions = [];

    this.syncPopulationAndMetrics();

    const population = this.state.getStats().population;
    const income = this.calculateIncome(population);
    if (income > 0) {
      this.state.applyIncome(income);
    }

    const serviceExpenses = this.calculateServiceExpense();
    if (serviceExpenses > 0) {
      this.state.applyExpense(serviceExpenses);
    }
  }

  private getActionContext(): CityActionContext {
    return {
      zoningSystem: this.zoningSystem,
      roadNetwork: this.roadNetwork,
      cityServices: this.cityServices
    };
  }

  private syncPopulationAndMetrics(): void {
    const population = this.calculatePopulation();
    this.state.updatePopulation(population);
    this.state.updateMetrics({
      happiness: this.calculateHappiness(),
      traffic: this.calculateTrafficLevel(),
      pollution: this.calculatePollutionLevel()
    });
  }

  private calculatePopulation(): number {
    const residentialZones = this.zoningSystem.getZonesByType('residential');
    return residentialZones.length * 10;
  }

  private calculateIncome(population: number): number {
    return population * 5;
  }

  private calculateServiceExpense(): number {
    const serviceBuildings = this.cityServices.getServiceBuildings();
    return serviceBuildings.length * 10;
  }

  private calculateHappiness(): number {
    const zones = this.zoningSystem.getAllZones();
    if (zones.length === 0) return 50;

    const totalHappiness = zones.reduce((sum, zone) => sum + zone.happiness, 0);
    return totalHappiness / zones.length;
  }

  private calculateTrafficLevel(): number {
    const vehicles = this.trafficSimulation.getAllVehicles();
    return Math.min(100, vehicles.length * 2);
  }

  private calculatePollutionLevel(): number {
    const industrialZones = this.zoningSystem.getZonesByType('industrial');
    return Math.min(100, industrialZones.length * 5);
  }

  async executeAction(action: ManagementAction): Promise<boolean> {
    const executed = executeCityAction(action, this.getActionContext(), this.state);
    if (!executed) {
      return false;
    }

    this.syncPopulationAndMetrics();
    return true;
  }

  dispose(): void {
    this.pauseSimulation();
    this.actions = [];
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
    const action = createZoneAction({
      startX,
      startY,
      endX,
      endY,
      zoneType: this.selectedZoneType
    });

    if (!this.state.canAfford(action.cost)) return false;

    this.actions.push(action);
    return true;
  }

  // Road management
  buildRoad(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    roadType: string = 'residential'
  ): boolean {
    const action = createRoadAction({ startX, startY, endX, endY, roadType });

    if (!this.state.canAfford(action.cost)) return false;

    this.actions.push(action);
    return true;
  }

  // Service management
  buildService(x: number, y: number): boolean {
    const action = createServiceAction({ x, y, serviceType: this.selectedServiceType });

    if (!this.state.canAfford(action.cost)) return false;

    this.actions.push(action);
    return true;
  }

  // Getters
  getStats(): CityStats {
    return this.state.getStats();
  }

  getBudget(): number {
    return this.state.getBudget();
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

export type { CityStats } from './cityManagement/CityManagementState';
export type { ManagementAction } from './cityManagement/cityActions';

export const cityManagement = new CityManagementInterface({
  gridWidth: 200,
  gridHeight: 200,
  initialBudget: 100000,
  difficulty: 'normal'
});
