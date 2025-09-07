import type { GameTime } from '../types/gameTime';
import type { MovingEntity, PathResult, RoadType } from './pathfinding';
import type { Intersection } from './roadNetwork';
import { pathfindingSystem } from './pathfinding';
import { roadNetworkSystem } from './roadNetwork';

export interface Vehicle {
  id: string;
  type: 'car' | 'truck' | 'bus' | 'emergency' | 'service';
  position: { x: number; y: number };
  destination: { x: number; y: number };
  currentPath: Array<{ x: number; y: number }>;
  pathIndex: number;
  speed: number; // current speed (0-1)
  maxSpeed: number; // maximum speed for this vehicle type
  acceleration: number;
  size: { width: number; height: number };
  priority: number; // 0-100, higher = more important (emergency vehicles)
  waitTime: number;
  fuel: number; // 0-1
  passengers: number;
  cargo: number; // 0-1
  state: 'moving' | 'waiting' | 'parked' | 'loading' | 'emergency';
  lastUpdate: number;
}

export interface Pedestrian {
  id: string;
  position: { x: number; y: number };
  destination: { x: number; y: number };
  currentPath: Array<{ x: number; y: number }>;
  pathIndex: number;
  speed: number; // current speed (0-1)
  maxSpeed: number;
  age: 'child' | 'adult' | 'elderly';
  mobility: 'walking' | 'wheelchair' | 'bicycle';
  purpose: 'work' | 'shopping' | 'leisure' | 'school' | 'home';
  waitTime: number;
  state: 'moving' | 'waiting' | 'crossing' | 'shopping';
  lastUpdate: number;
}

export interface TrafficLight {
  intersectionId: string;
  position: { x: number; y: number };
  currentState: 'red' | 'yellow' | 'green';
  timeInState: number;
  cycle: {
    red: number;
    yellow: number;
    green: number;
  };
  direction: 'north-south' | 'east-west';
}

export interface TrafficStats {
  totalVehicles: number;
  totalPedestrians: number;
  averageSpeed: number;
  congestionLevel: 'none' | 'light' | 'moderate' | 'heavy' | 'gridlock';
  averageWaitTime: number;
  accidents: number;
  emergencyResponseTime: number;
  publicTransportUsage: number;
}

export class TrafficSimulationSystem {
  private vehicles: Map<string, Vehicle>;
  private pedestrians: Map<string, Pedestrian>;
  private trafficLights: Map<string, TrafficLight>;
  private nextVehicleId: number;
  private nextPedestrianId: number;
  private congestionGrid: number[][] = []; // Traffic density per grid cell
  private accidentLocations: Array<{ x: number; y: number; severity: number; time: number }>;
  private emergencyVehicles: Set<string>;
  private gridWidth: number;
  private gridHeight: number;

  constructor(width: number, height: number) {
    this.vehicles = new Map();
    this.pedestrians = new Map();
    this.trafficLights = new Map();
    this.nextVehicleId = 1;
    this.nextPedestrianId = 1;
    this.accidentLocations = [];
    this.emergencyVehicles = new Set();
    this.gridWidth = width;
    this.gridHeight = height;
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

  // Spawn a new vehicle
  spawnVehicle(
    type: Vehicle['type'],
    start: { x: number; y: number },
    destination: { x: number; y: number },
    priority: number = 50
  ): string {
    const vehicleId = `vehicle_${this.nextVehicleId++}`;
    
    const vehicleSpecs = this.getVehicleSpecs(type);
    
    const vehicle: Vehicle = {
      id: vehicleId,
      type,
      position: { ...start },
      destination: { ...destination },
      currentPath: [],
      pathIndex: 0,
      speed: 0,
      maxSpeed: vehicleSpecs.maxSpeed,
      acceleration: vehicleSpecs.acceleration,
      size: vehicleSpecs.size,
      priority,
      waitTime: 0,
      fuel: 1.0,
      passengers: vehicleSpecs.defaultPassengers,
      cargo: 0,
      state: 'moving',
      lastUpdate: Date.now()
    };

    // Calculate initial path
    const pathResult = pathfindingSystem.findPath({
      start,
      end: destination,
      entityType: 'vehicle',
      priority,
      avoidTraffic: true,
      allowedRoadTypes: this.getAllowedRoadTypes(type)
    });

    if (pathResult.success) {
      vehicle.currentPath = pathResult.path;
    }

    this.vehicles.set(vehicleId, vehicle);
    
    if (type === 'emergency') {
      this.emergencyVehicles.add(vehicleId);
    }

    return vehicleId;
  }

  private getVehicleSpecs(type: Vehicle['type']) {
    const specs = {
      car: {
        maxSpeed: 0.8,
        acceleration: 0.1,
        size: { width: 1, height: 2 },
        defaultPassengers: 2
      },
      truck: {
        maxSpeed: 0.6,
        acceleration: 0.05,
        size: { width: 2, height: 4 },
        defaultPassengers: 1
      },
      bus: {
        maxSpeed: 0.7,
        acceleration: 0.07,
        size: { width: 2, height: 6 },
        defaultPassengers: 20
      },
      emergency: {
        maxSpeed: 1.0,
        acceleration: 0.15,
        size: { width: 1, height: 3 },
        defaultPassengers: 3
      },
      service: {
        maxSpeed: 0.5,
        acceleration: 0.08,
        size: { width: 1, height: 2 },
        defaultPassengers: 1
      }
    };
    
    return specs[type];
  }

  private getAllowedRoadTypes(vehicleType: Vehicle['type']): RoadType[] {
    switch (vehicleType) {
      case 'car':
        return ['residential', 'commercial', 'highway', 'intersection'];
      case 'truck':
        return ['commercial', 'highway', 'intersection'];
      case 'bus':
        return ['residential', 'commercial', 'intersection'];
      case 'emergency':
        return ['residential', 'commercial', 'highway', 'intersection', 'pedestrian'];
      case 'service':
        return ['residential', 'commercial', 'intersection'];
      default:
        return ['residential', 'commercial'];
    }
  }

  // Spawn a new pedestrian
  spawnPedestrian(
    start: { x: number; y: number },
    destination: { x: number; y: number },
    age: Pedestrian['age'] = 'adult',
    mobility: Pedestrian['mobility'] = 'walking',
    purpose: Pedestrian['purpose'] = 'leisure'
  ): string {
    const pedestrianId = `pedestrian_${this.nextPedestrianId++}`;
    
    const pedestrianSpecs = this.getPedestrianSpecs(age, mobility);
    
    const pedestrian: Pedestrian = {
      id: pedestrianId,
      position: { ...start },
      destination: { ...destination },
      currentPath: [],
      pathIndex: 0,
      speed: 0,
      maxSpeed: pedestrianSpecs.maxSpeed,
      age,
      mobility,
      purpose,
      waitTime: 0,
      state: 'moving',
      lastUpdate: Date.now()
    };

    // Calculate initial path
    const pathResult = pathfindingSystem.findPath({
      start,
      end: destination,
      entityType: 'pedestrian',
      priority: 30,
      avoidTraffic: false,
      allowedRoadTypes: ['pedestrian', 'residential', 'commercial']
    });

    if (pathResult.success) {
      pedestrian.currentPath = pathResult.path;
    }

    this.pedestrians.set(pedestrianId, pedestrian);
    return pedestrianId;
  }

  private getPedestrianSpecs(age: Pedestrian['age'], mobility: Pedestrian['mobility']) {
    let baseSpeed = 0.3;
    
    // Age modifiers
    switch (age) {
      case 'child':
        baseSpeed *= 0.7;
        break;
      case 'elderly':
        baseSpeed *= 0.6;
        break;
      case 'adult':
        baseSpeed *= 1.0;
        break;
    }
    
    // Mobility modifiers
    switch (mobility) {
      case 'wheelchair':
        baseSpeed *= 0.5;
        break;
      case 'bicycle':
        baseSpeed *= 2.0;
        break;
      case 'walking':
        baseSpeed *= 1.0;
        break;
    }
    
    return { maxSpeed: baseSpeed };
  }

  // Update simulation
  update(deltaTime: number): void {
    // Update traffic lights
    this.updateTrafficLights(deltaTime);
    
    // Update vehicles
    this.updateVehicles(deltaTime);
    
    // Update pedestrians
    this.updatePedestrians(deltaTime);
    
    // Update congestion grid
    this.updateCongestionGrid();
    
    // Handle accidents and emergencies
    this.handleEmergencies(deltaTime);
    
    // Clean up old accidents
    this.cleanupAccidents(deltaTime);
  }

  private updateTrafficLights(deltaTime: number): void {
    roadNetworkSystem.updateTrafficLights(deltaTime);
    
    // Update our traffic light states based on intersections
    const intersections = roadNetworkSystem.getAllIntersections();
    for (const intersection of intersections) {
      if (intersection.trafficLights) {
        const lightId = `light_${intersection.id}`;
        let light = this.trafficLights.get(lightId);
        
        if (!light) {
          light = {
            intersectionId: intersection.id,
            position: intersection.position,
            currentState: 'red',
            timeInState: 0,
            cycle: { red: 20, yellow: 3, green: 15 },
            direction: intersection.currentPhase === 'north-south' ? 'north-south' : 'east-west'
          };
          this.trafficLights.set(lightId, light);
        }
        
        // Update light state based on intersection phase
        light.timeInState += deltaTime;
        light.direction = intersection.currentPhase === 'north-south' ? 'north-south' : 'east-west';
        
        if (intersection.currentPhase === 'all-stop') {
          light.currentState = 'red';
        } else {
          light.currentState = 'green';
        }
      }
    }
  }

  private updateVehicles(deltaTime: number): void {
    for (const vehicle of this.vehicles.values()) {
      this.updateVehicleMovement(vehicle, deltaTime);
    }
  }

  private updateVehicleMovement(vehicle: Vehicle, deltaTime: number): void {
    if (vehicle.currentPath.length === 0 || vehicle.pathIndex >= vehicle.currentPath.length) {
      // Vehicle has reached destination or has no path
      if (this.isAtDestination(vehicle.position, vehicle.destination)) {
        this.removeVehicle(vehicle.id);
        return;
      }
      
      // Recalculate path
      this.recalculateVehiclePath(vehicle);
      return;
    }

    const targetPosition = vehicle.currentPath[vehicle.pathIndex];
    const distance = this.calculateDistance(vehicle.position, targetPosition);
    
    // Check for obstacles and traffic
    const canMove = this.canVehicleMove(vehicle, targetPosition);
    
    if (!canMove) {
      vehicle.waitTime += deltaTime;
      vehicle.speed = Math.max(0, vehicle.speed - vehicle.acceleration * deltaTime);
      vehicle.state = 'waiting';
      return;
    }
    
    vehicle.waitTime = 0;
    vehicle.state = 'moving';
    
    // Calculate movement
    const targetSpeed = this.calculateTargetSpeed(vehicle, targetPosition);
    
    // Accelerate or decelerate towards target speed
    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + vehicle.acceleration * deltaTime);
    } else {
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - vehicle.acceleration * deltaTime);
    }
    
    // Move vehicle
    const moveDistance = vehicle.speed * deltaTime * 10; // Scale for game units
    
    if (distance <= moveDistance) {
      // Reached current waypoint
      vehicle.position = { ...targetPosition };
      vehicle.pathIndex++;
    } else {
      // Move towards waypoint
      const ratio = moveDistance / distance;
      vehicle.position.x += (targetPosition.x - vehicle.position.x) * ratio;
      vehicle.position.y += (targetPosition.y - vehicle.position.y) * ratio;
    }
    
    vehicle.lastUpdate = Date.now();
  }

  private canVehicleMove(vehicle: Vehicle, targetPosition: { x: number; y: number }): boolean {
    // Check traffic lights
    const nearbyLight = this.getNearbyTrafficLight(targetPosition);
    if (nearbyLight && nearbyLight.currentState === 'red') {
      return false;
    }
    
    // Check for other vehicles
    const nearbyVehicles = this.getVehiclesInArea(
      targetPosition.x - 1, targetPosition.y - 1,
      targetPosition.x + 1, targetPosition.y + 1
    );
    
    for (const otherVehicle of nearbyVehicles) {
      if (otherVehicle.id !== vehicle.id) {
        const distance = this.calculateDistance(targetPosition, otherVehicle.position);
        if (distance < 2) { // Minimum following distance
          // Emergency vehicles can override
          if (vehicle.type === 'emergency' && otherVehicle.type !== 'emergency') {
            return true;
          }
          return false;
        }
      }
    }
    
    return true;
  }

  private calculateTargetSpeed(vehicle: Vehicle, targetPosition: { x: number; y: number }): number {
    let targetSpeed = vehicle.maxSpeed;
    
    // Road type speed limits
    const road = roadNetworkSystem.getRoadAt(Math.floor(targetPosition.x), Math.floor(targetPosition.y));
    if (road) {
      const speedLimit = road.speedLimit / 100; // Convert to 0-1 scale
      targetSpeed = Math.min(targetSpeed, speedLimit);
    }
    
    // Traffic congestion
    const congestion = this.getCongestionAt(targetPosition.x, targetPosition.y);
    targetSpeed *= (1 - congestion * 0.7);
    
    // Emergency vehicles ignore some restrictions
    if (vehicle.type === 'emergency') {
      targetSpeed = vehicle.maxSpeed;
    }
    
    return Math.max(0.1, targetSpeed);
  }

  private updatePedestrians(deltaTime: number): void {
    for (const pedestrian of this.pedestrians.values()) {
      this.updatePedestrianMovement(pedestrian, deltaTime);
    }
  }

  private updatePedestrianMovement(pedestrian: Pedestrian, deltaTime: number): void {
    if (pedestrian.currentPath.length === 0 || pedestrian.pathIndex >= pedestrian.currentPath.length) {
      if (this.isAtDestination(pedestrian.position, pedestrian.destination)) {
        this.removePedestrian(pedestrian.id);
        return;
      }
      
      this.recalculatePedestrianPath(pedestrian);
      return;
    }

    const targetPosition = pedestrian.currentPath[pedestrian.pathIndex];
    const distance = this.calculateDistance(pedestrian.position, targetPosition);
    
    // Simple pedestrian movement (they're more flexible than vehicles)
    const moveDistance = pedestrian.maxSpeed * deltaTime * 10;
    
    if (distance <= moveDistance) {
      pedestrian.position = { ...targetPosition };
      pedestrian.pathIndex++;
    } else {
      const ratio = moveDistance / distance;
      pedestrian.position.x += (targetPosition.x - pedestrian.position.x) * ratio;
      pedestrian.position.y += (targetPosition.y - pedestrian.position.y) * ratio;
    }
    
    pedestrian.lastUpdate = Date.now();
  }

  private updateCongestionGrid(): void {
    // Reset congestion
    for (let x = 0; x < this.gridWidth; x++) {
      for (let y = 0; y < this.gridHeight; y++) {
        this.congestionGrid[x][y] = 0;
      }
    }
    
    // Add vehicle congestion
    for (const vehicle of this.vehicles.values()) {
      const x = Math.floor(vehicle.position.x);
      const y = Math.floor(vehicle.position.y);
      
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.congestionGrid[x][y] += vehicle.state === 'waiting' ? 0.8 : 0.3;
        
        // Update pathfinding system
        pathfindingSystem.updateTrafficData(x, y, this.congestionGrid[x][y]);
      }
    }
  }

  private handleEmergencies(deltaTime: number): void {
    // Handle emergency vehicle priority
    for (const emergencyId of this.emergencyVehicles) {
      const emergency = this.vehicles.get(emergencyId);
      if (!emergency) continue;
      
      // Clear path for emergency vehicles
      const nearbyVehicles = this.getVehiclesInArea(
        emergency.position.x - 3, emergency.position.y - 3,
        emergency.position.x + 3, emergency.position.y + 3
      );
      
      for (const vehicle of nearbyVehicles) {
        if (vehicle.id !== emergency.id && vehicle.type !== 'emergency') {
          // Move vehicle out of the way (simplified)
          vehicle.state = 'waiting';
          vehicle.waitTime += deltaTime;
        }
      }
    }
  }

  private cleanupAccidents(deltaTime: number): void {
    const currentTime = Date.now();
    this.accidentLocations = this.accidentLocations.filter(
      accident => currentTime - accident.time < 300000 // Remove after 5 minutes
    );
  }

  // Helper methods
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private isAtDestination(position: { x: number; y: number }, destination: { x: number; y: number }): boolean {
    return this.calculateDistance(position, destination) < 1;
  }

  private recalculateVehiclePath(vehicle: Vehicle): void {
    const pathResult = pathfindingSystem.findPath({
      start: vehicle.position,
      end: vehicle.destination,
      entityType: 'vehicle',
      priority: vehicle.priority,
      avoidTraffic: true,
      allowedRoadTypes: this.getAllowedRoadTypes(vehicle.type)
    });

    if (pathResult.success) {
      vehicle.currentPath = pathResult.path;
      vehicle.pathIndex = 0;
    }
  }

  private recalculatePedestrianPath(pedestrian: Pedestrian): void {
    const pathResult = pathfindingSystem.findPath({
      start: pedestrian.position,
      end: pedestrian.destination,
      entityType: 'pedestrian',
      priority: 30,
      avoidTraffic: false,
      allowedRoadTypes: ['pedestrian', 'residential', 'commercial']
    });

    if (pathResult.success) {
      pedestrian.currentPath = pathResult.path;
      pedestrian.pathIndex = 0;
    }
  }

  private getNearbyTrafficLight(position: { x: number; y: number }): TrafficLight | null {
    for (const light of this.trafficLights.values()) {
      const distance = this.calculateDistance(position, light.position);
      if (distance < 2) {
        return light;
      }
    }
    return null;
  }

  private getVehiclesInArea(x1: number, y1: number, x2: number, y2: number): Vehicle[] {
    const vehicles: Vehicle[] = [];
    
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.position.x >= x1 && vehicle.position.x <= x2 &&
          vehicle.position.y >= y1 && vehicle.position.y <= y2) {
        vehicles.push(vehicle);
      }
    }
    
    return vehicles;
  }

  private getCongestionAt(x: number, y: number): number {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    if (gridX >= 0 && gridX < this.gridWidth && gridY >= 0 && gridY < this.gridHeight) {
      return Math.min(1, this.congestionGrid[gridX][gridY]);
    }
    
    return 0;
  }

  // Public methods
  removeVehicle(vehicleId: string): boolean {
    const removed = this.vehicles.delete(vehicleId);
    this.emergencyVehicles.delete(vehicleId);
    return removed;
  }

  removePedestrian(pedestrianId: string): boolean {
    return this.pedestrians.delete(pedestrianId);
  }

  getTrafficStats(): TrafficStats {
    const vehicles = Array.from(this.vehicles.values());
    const pedestrians = Array.from(this.pedestrians.values());
    
    const totalSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0);
    const averageSpeed = vehicles.length > 0 ? totalSpeed / vehicles.length : 0;
    
    const totalWaitTime = vehicles.reduce((sum, v) => sum + v.waitTime, 0);
    const averageWaitTime = vehicles.length > 0 ? totalWaitTime / vehicles.length : 0;
    
    // Calculate congestion level
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
    const publicTransportUsage = busCount > 0 ? 
      vehicles.filter(v => v.type === 'bus').reduce((sum, v) => sum + v.passengers, 0) / busCount : 0;
    
    return {
      totalVehicles: vehicles.length,
      totalPedestrians: pedestrians.length,
      averageSpeed,
      congestionLevel,
      averageWaitTime,
      accidents: this.accidentLocations.length,
      emergencyResponseTime: 0, // TODO: Calculate based on emergency vehicle performance
      publicTransportUsage
    };
  }

  getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  getAllPedestrians(): Pedestrian[] {
    return Array.from(this.pedestrians.values());
  }

  getTrafficLights(): TrafficLight[] {
    return Array.from(this.trafficLights.values());
  }
}

// Export singleton instance
export const trafficSimulationSystem = new TrafficSimulationSystem(200, 200);