import { pathfindingSystem } from '../pathfinding';
import { VehicleManager } from './vehicleManager';
import { PedestrianManager } from './pedestrianManager';
import { TrafficLightController } from './trafficLightController';
import type { TrafficStats, Vehicle, Pedestrian, TrafficLight } from './types';

export class TrafficSimulationSystem {
  private vehicleManager: VehicleManager;
  private pedestrianManager: PedestrianManager;
  private trafficLightController: TrafficLightController;
  private congestionGrid: number[][] = [];
  private accidentLocations: Array<{ x: number; y: number; severity: number; time: number }> = [];
  private gridWidth: number;
  private gridHeight: number;

  constructor(width: number, height: number) {
    this.gridWidth = width;
    this.gridHeight = height;
    this.trafficLightController = new TrafficLightController();
    this.vehicleManager = new VehicleManager(this.trafficLightController, (x, y) => this.getCongestionAt(x, y));
    this.pedestrianManager = new PedestrianManager();
    this.initializeCongestionGrid();
  }

  private initializeCongestionGrid(): void {
    this.congestionGrid = [];
    for (let x = 0; x < this.gridWidth; x++) {
      this.congestionGrid[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        this.congestionGrid[x][y] = 0;
      }
    }
  }

  update(deltaTime: number): void {
    this.trafficLightController.update(deltaTime);
    this.vehicleManager.update(deltaTime);
    this.pedestrianManager.update(deltaTime);
    this.updateCongestionGrid();
    this.handleEmergencies(deltaTime);
    this.cleanupAccidents();
  }

  spawnVehicle(
    type: Vehicle['type'],
    start: { x: number; y: number },
    destination: { x: number; y: number },
    priority = 50
  ): string {
    return this.vehicleManager.spawnVehicle(type, start, destination, priority);
  }

  spawnPedestrian(start: { x: number; y: number }, destination: { x: number; y: number }): string {
    return this.pedestrianManager.spawnPedestrian(start, destination);
  }

  removeVehicle(id: string): boolean {
    return this.vehicleManager.removeVehicle(id);
  }

  removePedestrian(id: string): boolean {
    return this.pedestrianManager.removePedestrian(id);
  }

  getAllVehicles(): Vehicle[] {
    return this.vehicleManager.getAllVehicles();
  }

  getAllPedestrians(): Pedestrian[] {
    return this.pedestrianManager.getAllPedestrians();
  }

  getTrafficLights(): TrafficLight[] {
    return this.trafficLightController.getTrafficLights();
  }

  getTrafficStats(): TrafficStats {
    const vehicles = this.vehicleManager.getAllVehicles();
    const pedestrians = this.pedestrianManager.getAllPedestrians();

    const totalSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0);
    const averageSpeed = vehicles.length > 0 ? totalSpeed / vehicles.length : 0;

    const totalWaitTime = vehicles.reduce((sum, v) => sum + v.waitTime, 0);
    const averageWaitTime = vehicles.length > 0 ? totalWaitTime / vehicles.length : 0;

    let totalCongestion = 0;
    let congestionCells = 0;
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        if (this.congestionGrid[x][y] > 0) {
          totalCongestion += this.congestionGrid[x][y];
          congestionCells++;
        }
      }
    }
    const avgCongestion = congestionCells > 0 ? totalCongestion / congestionCells : 0;

    let congestionLevel: TrafficStats['congestionLevel'] = 'none';
    if (avgCongestion > 0.8) congestionLevel = 'gridlock';
    else if (avgCongestion > 0.6) congestionLevel = 'heavy';
    else if (avgCongestion > 0.4) congestionLevel = 'moderate';
    else if (avgCongestion > 0.2) congestionLevel = 'light';

    const busCount = vehicles.filter(v => v.type === 'bus').length;
    const publicTransportUsage = busCount > 0
      ? vehicles.filter(v => v.type === 'bus').reduce((sum, v) => sum + v.passengers, 0) / busCount
      : 0;

    return {
      totalVehicles: vehicles.length,
      totalPedestrians: pedestrians.length,
      averageSpeed,
      congestionLevel,
      averageWaitTime,
      accidents: this.accidentLocations.length,
      emergencyResponseTime: 0,
      publicTransportUsage
    };
  }

  private updateCongestionGrid(): void {
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.congestionGrid[x][y] = 0;
      }
    }

    for (const vehicle of this.vehicleManager.getAllVehicles()) {
      const x = Math.floor(vehicle.position.x);
      const y = Math.floor(vehicle.position.y);
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.congestionGrid[x][y] += vehicle.state === 'waiting' ? 0.8 : 0.3;
        pathfindingSystem.updateTrafficData(x, y, this.congestionGrid[x][y]);
      }
    }
  }

  private handleEmergencies(deltaTime: number): void {
    for (const emergencyId of this.vehicleManager.getEmergencyVehicles()) {
      const emergency = this.vehicleManager.getVehicleById(emergencyId);
      if (!emergency) continue;
      const nearbyVehicles = this.vehicleManager.getVehiclesInArea(
        emergency.position.x - 3,
        emergency.position.y - 3,
        emergency.position.x + 3,
        emergency.position.y + 3
      );
      for (const vehicle of nearbyVehicles) {
        if (vehicle.id !== emergency.id && vehicle.type !== 'emergency') {
          vehicle.state = 'waiting';
          vehicle.waitTime += deltaTime;
        }
      }
    }
  }

  private cleanupAccidents(): void {
    const currentTime = Date.now();
    this.accidentLocations = this.accidentLocations.filter(
      accident => currentTime - accident.time < 300000
    );
  }

  private getCongestionAt(x: number, y: number): number {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
      return Math.min(1, this.congestionGrid[gridX][gridY]);
    }
    return 0;
  }
}

export const trafficSimulationSystem = new TrafficSimulationSystem(200, 200);
