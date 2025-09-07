import { Position } from './cityServices';

export interface TransportStop {
  id: string;
  position: Position;
  type: TransportType;
  name: string;
  capacity: number;
  currentPassengers: number;
  waitingPassengers: Passenger[];
  connections: string[]; // IDs of connected stops
  accessibility: boolean;
  maintenanceCost: number;
  constructionCost: number;
}

export interface TransportRoute {
  id: string;
  name: string;
  type: TransportType;
  stops: string[]; // Stop IDs in order
  vehicles: TransportVehicle[];
  frequency: number; // minutes between vehicles
  operatingHours: { start: number; end: number };
  fare: number;
  capacity: number;
  currentLoad: number;
  efficiency: number;
  profitability: number;
  maintenanceCost: number;
}

export interface TransportVehicle {
  id: string;
  type: TransportType;
  routeId: string;
  currentStopIndex: number;
  nextStopIndex: number;
  position: Position;
  passengers: Passenger[];
  capacity: number;
  speed: number;
  fuel: number;
  maxFuel: number;
  condition: number; // 0-100, affects efficiency
  lastMaintenance: number;
}

export interface Passenger {
  id: string;
  citizenId: string;
  origin: string; // stop ID
  destination: string; // stop ID
  boardTime: number;
  patience: number; // decreases while waiting
  preferredRoute?: string;
  ticketType: 'single' | 'day' | 'weekly' | 'monthly';
}

export enum TransportType {
  BUS = 'bus',
  METRO = 'metro',
  TRAM = 'tram',
  TRAIN = 'train',
  FERRY = 'ferry'
}

export interface TransportDemand {
  origin: string;
  destination: string;
  timeOfDay: number;
  passengers: number;
  averageWaitTime: number;
}

export interface TransportStats {
  totalPassengers: number;
  averageWaitTime: number;
  systemEfficiency: number;
  revenue: number;
  operatingCost: number;
  profit: number;
  coverage: number; // percentage of city covered
}

export class PublicTransportSystem {
  private stops: Map<string, TransportStop> = new Map();
  private routes: Map<string, TransportRoute> = new Map();
  private vehicles: Map<string, TransportVehicle> = new Map();
  private passengers: Map<string, Passenger> = new Map();
  private demandData: TransportDemand[] = [];
  private gridWidth: number;
  private gridHeight: number;
  private coverageRadius: number = 5;

  constructor(gridWidth: number, gridHeight: number) {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
  }

  // Stop Management
  addStop(stop: TransportStop): void {
    this.stops.set(stop.id, stop);
    this.updateConnections(stop);
  }

  removeStop(stopId: string): void {
    const stop = this.stops.get(stopId);
    if (!stop) return;

    // Remove from all routes
    this.routes.forEach(route => {
      const index = route.stops.indexOf(stopId);
      if (index !== -1) {
        route.stops.splice(index, 1);
      }
    });

    // Remove connections
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
    // Connect to nearby stops of the same type
    this.stops.forEach(existingStop => {
      if (existingStop.id === newStop.id || existingStop.type !== newStop.type) return;
      
      const distance = this.calculateDistance(newStop.position, existingStop.position);
      const maxConnectionDistance = this.getMaxConnectionDistance(newStop.type);
      
      if (distance <= maxConnectionDistance) {
        newStop.connections.push(existingStop.id);
        existingStop.connections.push(newStop.id);
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
    this.routes.set(route.id, route);
    this.spawnVehiclesForRoute(route);
  }

  private spawnVehiclesForRoute(route: TransportRoute): void {
    const vehicleCount = Math.max(1, Math.floor(route.stops.length / 3));
    
    for (let i = 0; i < vehicleCount; i++) {
      const vehicle: TransportVehicle = {
        id: `${route.id}_vehicle_${i}`,
        type: route.type,
        routeId: route.id,
        currentStopIndex: Math.floor(i * route.stops.length / vehicleCount),
        nextStopIndex: 0,
        position: this.getStopPosition(route.stops[0]) || { x: 0, y: 0 },
        passengers: [],
        capacity: this.getVehicleCapacity(route.type),
        speed: this.getVehicleSpeed(route.type),
        fuel: 100,
        maxFuel: 100,
        condition: 100,
        lastMaintenance: Date.now()
      };
      
      this.vehicles.set(vehicle.id, vehicle);
      route.vehicles.push(vehicle);
    }
  }

  private getVehicleCapacity(type: TransportType): number {
    switch (type) {
      case TransportType.BUS: return 40;
      case TransportType.TRAM: return 80;
      case TransportType.METRO: return 150;
      case TransportType.TRAIN: return 300;
      case TransportType.FERRY: return 100;
      default: return 50;
    }
  }

  private getVehicleSpeed(type: TransportType): number {
    switch (type) {
      case TransportType.BUS: return 2;
      case TransportType.TRAM: return 3;
      case TransportType.METRO: return 5;
      case TransportType.TRAIN: return 8;
      case TransportType.FERRY: return 1.5;
      default: return 2;
    }
  }

  private getStopPosition(stopId: string): Position | null {
    const stop = this.stops.get(stopId);
    return stop ? stop.position : null;
  }

  // Passenger Management
  addPassenger(citizenId: string, origin: string, destination: string): void {
    const originStop = this.stops.get(origin);
    const destinationStop = this.stops.get(destination);
    
    if (!originStop || !destinationStop) return;

    const passenger: Passenger = {
      id: `passenger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      citizenId,
      origin,
      destination,
      boardTime: Date.now(),
      patience: 100,
      ticketType: 'single'
    };

    this.passengers.set(passenger.id, passenger);
    originStop.waitingPassengers.push(passenger);
  }

  // Pathfinding for public transport
  findRoute(origin: string, destination: string): string[] | null {
    const visited = new Set<string>();
    const queue: Array<{ stopId: string; path: string[] }> = [{ stopId: origin, path: [origin] }];
    
    while (queue.length > 0) {
      const { stopId, path } = queue.shift()!;
      
      if (stopId === destination) {
        return path;
      }
      
      if (visited.has(stopId)) continue;
      visited.add(stopId);
      
      const stop = this.stops.get(stopId);
      if (!stop) continue;
      
      // Check direct connections
      stop.connections.forEach(connectedId => {
        if (!visited.has(connectedId)) {
          queue.push({ stopId: connectedId, path: [...path, connectedId] });
        }
      });
      
      // Check route connections (transfers)
      this.routes.forEach(route => {
        if (route.stops.includes(stopId)) {
          route.stops.forEach(routeStopId => {
            if (!visited.has(routeStopId) && routeStopId !== stopId) {
              queue.push({ stopId: routeStopId, path: [...path, routeStopId] });
            }
          });
        }
      });
    }
    
    return null;
  }

  // System Update
  update(deltaTime: number): void {
    this.updateVehicles(deltaTime);
    this.updatePassengers(deltaTime);
    this.updateDemand();
    this.optimizeRoutes();
  }

  private updateVehicles(deltaTime: number): void {
    this.vehicles.forEach(vehicle => {
      const route = this.routes.get(vehicle.routeId);
      if (!route) return;

      // Move vehicle towards next stop
      const currentStop = this.stops.get(route.stops[vehicle.currentStopIndex]);
      const nextStop = this.stops.get(route.stops[vehicle.nextStopIndex]);
      
      if (!currentStop || !nextStop) return;

      // Calculate movement
      const dx = nextStop.position.x - vehicle.position.x;
      const dy = nextStop.position.y - vehicle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 0.5) {
        // Arrived at stop
        vehicle.position = nextStop.position;
        vehicle.currentStopIndex = vehicle.nextStopIndex;
        vehicle.nextStopIndex = (vehicle.nextStopIndex + 1) % route.stops.length;
        
        // Handle passenger boarding/alighting
        this.handleStopOperations(vehicle, nextStop);
      } else {
        // Move towards next stop
        const moveDistance = vehicle.speed * deltaTime * (vehicle.condition / 100);
        vehicle.position.x += (dx / distance) * moveDistance;
        vehicle.position.y += (dy / distance) * moveDistance;
      }

      // Update vehicle condition
      vehicle.condition = Math.max(0, vehicle.condition - 0.001 * deltaTime);
      vehicle.fuel = Math.max(0, vehicle.fuel - 0.01 * deltaTime);
    });
  }

  private handleStopOperations(vehicle: TransportVehicle, stop: TransportStop): void {
    // Passengers alighting
    vehicle.passengers = vehicle.passengers.filter(passenger => {
      if (passenger.destination === stop.id) {
        this.passengers.delete(passenger.id);
        return false;
      }
      return true;
    });

    // Passengers boarding
    const availableSpace = vehicle.capacity - vehicle.passengers.length;
    const boardingPassengers = stop.waitingPassengers.splice(0, availableSpace);
    
    boardingPassengers.forEach(passenger => {
      vehicle.passengers.push(passenger);
      stop.currentPassengers++;
    });
  }

  private updatePassengers(deltaTime: number): void {
    this.passengers.forEach(passenger => {
      passenger.patience = Math.max(0, passenger.patience - 0.1 * deltaTime);
      
      // Remove passengers who run out of patience
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
    // Analyze passenger flow patterns
    const currentHour = new Date().getHours();
    const demandMap = new Map<string, number>();
    
    this.passengers.forEach(passenger => {
      const key = `${passenger.origin}-${passenger.destination}`;
      demandMap.set(key, (demandMap.get(key) || 0) + 1);
    });
    
    // Update demand data
    this.demandData = Array.from(demandMap.entries()).map(([key, count]) => {
      const [origin, destination] = key.split('-');
      return {
        origin,
        destination,
        timeOfDay: currentHour,
        passengers: count,
        averageWaitTime: this.calculateAverageWaitTime(origin)
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
    
    return totalWaitTime / stop.waitingPassengers.length / 1000; // Convert to seconds
  }

  private optimizeRoutes(): void {
    // Simple route optimization based on demand
    this.routes.forEach(route => {
      const routeDemand = this.demandData.filter(demand => 
        route.stops.includes(demand.origin) && route.stops.includes(demand.destination)
      );
      
      const totalDemand = routeDemand.reduce((sum, demand) => sum + demand.passengers, 0);
      const avgWaitTime = routeDemand.reduce((sum, demand) => sum + demand.averageWaitTime, 0) / Math.max(1, routeDemand.length);
      
      // Adjust frequency based on demand
      if (totalDemand > route.capacity * 0.8) {
        route.frequency = Math.max(2, route.frequency - 1); // Increase frequency
      } else if (totalDemand < route.capacity * 0.3) {
        route.frequency = Math.min(15, route.frequency + 1); // Decrease frequency
      }
      
      // Update efficiency
      route.efficiency = Math.min(100, (totalDemand / Math.max(1, route.capacity)) * 100);
    });
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
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
      coverage
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