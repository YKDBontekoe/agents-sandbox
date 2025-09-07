import { randomUUID } from 'crypto';
import { Position } from '../cityServices';
import {
  TransportStop,
  TransportRoute,
  TransportVehicle,
  Passenger,
  TransportDemand,
  TransportStats,
  TransportType,
} from './types';
import { RouteManager } from './routeManager';
import { VehicleManager } from './vehicleManager';

export class PublicTransportSystem {
  private stops: Map<string, TransportStop> = new Map();
  private routes: Map<string, TransportRoute> = new Map();
  private vehicles: Map<string, TransportVehicle> = new Map();
  private passengers: Map<string, Passenger> = new Map();
  private demandData: TransportDemand[] = [];
  private routeManager: RouteManager;
  private vehicleManager: VehicleManager;
  private gridWidth: number;
  private gridHeight: number;
  private coverageRadius: number = 5;

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.routeManager = new RouteManager(this.stops, this.routes);
    this.vehicleManager = new VehicleManager(this.stops, this.routes, this.vehicles, this.passengers);
  }

  // Stop Management
  addStop(stop: TransportStop): void {
    this.stops.set(stop.id, stop);
    this.updateConnections(stop);
  }

  removeStop(stopId: string): void {
    const stop = this.stops.get(stopId);
    if (!stop) return;

    this.routes.forEach(route => {
      const index = route.stops.indexOf(stopId);
      if (index !== -1) {
        route.stops.splice(index, 1);
      }
    });

    stop.connections.forEach(connectedId => {
      const connectedStop = this.stops.get(connectedId);
      if (connectedStop) {
        const connIndex = connectedStop.connections.indexOf(stopId);
        if (connIndex !== -1) {
          connectedStop.connections.splice(connIndex, 1);
        }
      }
    });

    this.stops.delete(stopId);
  }

  private updateConnections(newStop: TransportStop): void {
    this.stops.forEach(existingStop => {
      if (existingStop.id === newStop.id || existingStop.type !== newStop.type) return;
      const distance = this.calculateDistance(newStop.position, existingStop.position);
      const maxConnectionDistance = this.getMaxConnectionDistance(newStop.type);
      if (distance <= maxConnectionDistance) {
        if (!newStop.connections.includes(existingStop.id)) {
          newStop.connections.push(existingStop.id);
        }
        if (!existingStop.connections.includes(newStop.id)) {
          existingStop.connections.push(newStop.id);
        }
      }
    });
  }

  private getMaxConnectionDistance(type: TransportType): number {
    switch (type) {
      case TransportType.BUS: return 8;
      case TransportType.TRAM: return 6;
      case TransportType.METRO: return 15;
      case TransportType.TRAIN: return 25;
      case TransportType.FERRY: return 20;
      default: return 10;
    }
  }

  // Route Management
  createRoute(route: TransportRoute): void {
    this.routeManager.createRoute(route);
    this.vehicleManager.spawnVehiclesForRoute(route);
  }

  findRoute(origin: string, destination: string): string[] | null {
    return this.routeManager.findRoute(origin, destination);
  }

  // Passenger Management
  addPassenger(citizenId: string, origin: string, destination: string): void {
    const originStop = this.stops.get(origin);
    const destinationStop = this.stops.get(destination);
    if (!originStop || !destinationStop) return;

    const passenger: Passenger = {
      id: `passenger_${randomUUID()}`,
      citizenId,
      origin,
      destination,
      boardTime: Date.now(),
      patience: 100,
      ticketType: 'single',
    };

    this.passengers.set(passenger.id, passenger);
    originStop.waitingPassengers.push(passenger);
  }

  // System Update
  update(deltaTime: number): void {
    this.vehicleManager.updateVehicles(deltaTime);
    this.updatePassengers(deltaTime);
    this.updateDemand();
    this.routeManager.optimizeRoutes(this.demandData);
  }

  private updatePassengers(deltaTime: number): void {
    this.passengers.forEach(passenger => {
      passenger.patience = Math.max(0, passenger.patience - 0.1 * deltaTime);
      if (passenger.patience <= 0) {
        const originStop = this.stops.get(passenger.origin);
        if (originStop) {
          const index = originStop.waitingPassengers.indexOf(passenger);
          if (index !== -1) {
            originStop.waitingPassengers.splice(index, 1);
          }
        }
        this.passengers.delete(passenger.id);
      }
    });
  }

  private updateDemand(): void {
    const currentHour = new Date().getHours();
    const demandMap = new Map<string, number>();

    this.passengers.forEach(passenger => {
      const key = `${passenger.origin}-${passenger.destination}`;
      demandMap.set(key, (demandMap.get(key) || 0) + 1);
    });

    this.demandData = Array.from(demandMap.entries()).map(([key, count]) => {
      const [origin, destination] = key.split('-');
      return {
        origin,
        destination,
        timeOfDay: currentHour,
        passengers: count,
        averageWaitTime: this.calculateAverageWaitTime(origin),
      };
    });
  }

  private calculateAverageWaitTime(stopId: string): number {
    const stop = this.stops.get(stopId);
    if (!stop || stop.waitingPassengers.length === 0) return 0;

    const currentTime = Date.now();
    const totalWaitTime = stop.waitingPassengers.reduce((sum, passenger) => {
      return sum + (currentTime - passenger.boardTime);
    }, 0);

    return totalWaitTime / stop.waitingPassengers.length / 1000;
  }

  // Statistics and Analytics
  getSystemStats(): TransportStats {
    const totalPassengers = this.passengers.size;
    const totalWaitTime = Array.from(this.stops.values()).reduce((sum, stop) => {
      return sum + this.calculateAverageWaitTime(stop.id) * stop.waitingPassengers.length;
    }, 0);
    const averageWaitTime = totalWaitTime / Math.max(1, totalPassengers);

    const totalRevenue = Array.from(this.routes.values()).reduce((sum, route) => {
      return sum + (route.currentLoad * route.fare);
    }, 0);

    const totalCost = Array.from(this.routes.values()).reduce((sum, route) => {
      return sum + route.maintenanceCost;
    }, 0) + Array.from(this.stops.values()).reduce((sum, stop) => {
      return sum + stop.maintenanceCost;
    }, 0);

    const systemEfficiency = Array.from(this.routes.values()).reduce((sum, route) => {
      return sum + route.efficiency;
    }, 0) / Math.max(1, this.routes.size);

    const coverage = this.calculateCoverage();

    return {
      totalPassengers,
      averageWaitTime,
      systemEfficiency,
      revenue: totalRevenue,
      operatingCost: totalCost,
      profit: totalRevenue - totalCost,
      coverage,
    };
  }

  private calculateCoverage(): number {
    const totalCells = this.gridWidth * this.gridHeight;
    const coveredCells = new Set<string>();

    this.stops.forEach(stop => {
      for (let x = Math.max(0, stop.position.x - this.coverageRadius);
           x <= Math.min(this.gridWidth - 1, stop.position.x + this.coverageRadius); x++) {
        for (let y = Math.max(0, stop.position.y - this.coverageRadius);
             y <= Math.min(this.gridHeight - 1, stop.position.y + this.coverageRadius); y++) {
          const distance = this.calculateDistance(stop.position, { x, y });
          if (distance <= this.coverageRadius) {
            coveredCells.add(`${x},${y}`);
          }
        }
      }
    });

    return (coveredCells.size / totalCells) * 100;
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
  }

  // Getters
  getStops(): TransportStop[] {
    return Array.from(this.stops.values());
  }

  getRoutes(): TransportRoute[] {
    return Array.from(this.routes.values());
  }

  getVehicles(): TransportVehicle[] {
    return Array.from(this.vehicles.values());
  }

  getPassengers(): Passenger[] {
    return Array.from(this.passengers.values());
  }

  getDemandData(): TransportDemand[] {
    return [...this.demandData];
  }

  getStop(id: string): TransportStop | undefined {
    return this.stops.get(id);
  }

  getRoute(id: string): TransportRoute | undefined {
    return this.routes.get(id);
  }
}
