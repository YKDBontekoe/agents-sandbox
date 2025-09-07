import type { Vehicle, TrafficLight } from './types';
import type { RoadType } from '../pathfinding';
import { pathfindingSystem } from '../pathfinding';
import { roadNetworkSystem } from '../roadNetwork';
import { TrafficLightController } from './trafficLightController';

export class VehicleManager {
  private vehicles = new Map<string, Vehicle>();
  private nextVehicleId = 1;
  private emergencyVehicles = new Set<string>();

  constructor(
    private trafficLightController: TrafficLightController,
    private getCongestionAt: (x: number, y: number) => number
  ) {}

  spawnVehicle(
    type: Vehicle['type'],
    start: { x: number; y: number },
    destination: { x: number; y: number },
    priority = 50
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
      fuel: 1,
      passengers: vehicleSpecs.defaultPassengers,
      cargo: 0,
      state: 'moving',
      lastUpdate: Date.now()
    };

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

  update(deltaTime: number): void {
    for (const vehicle of this.vehicles.values()) {
      this.updateVehicleMovement(vehicle, deltaTime);
    }
  }

  removeVehicle(vehicleId: string): boolean {
    const removed = this.vehicles.delete(vehicleId);
    this.emergencyVehicles.delete(vehicleId);
    return removed;
  }

  getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  getVehiclesInArea(x1: number, y1: number, x2: number, y2: number): Vehicle[] {
    const vehicles: Vehicle[] = [];
    for (const vehicle of this.vehicles.values()) {
      if (
        vehicle.position.x >= x1 &&
        vehicle.position.x <= x2 &&
        vehicle.position.y >= y1 &&
        vehicle.position.y <= y2
      ) {
        vehicles.push(vehicle);
      }
    }
    return vehicles;
  }

  getVehicleById(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }

  getEmergencyVehicles(): Set<string> {
    return this.emergencyVehicles;
  }

  private updateVehicleMovement(vehicle: Vehicle, deltaTime: number): void {
    if (vehicle.currentPath.length === 0 || vehicle.pathIndex >= vehicle.currentPath.length) {
      if (this.isAtDestination(vehicle.position, vehicle.destination)) {
        this.removeVehicle(vehicle.id);
        return;
      }
      this.recalculateVehiclePath(vehicle);
      return;
    }

    const targetPosition = vehicle.currentPath[vehicle.pathIndex];
    const distance = this.calculateDistance(vehicle.position, targetPosition);

    const canMove = this.canVehicleMove(vehicle, targetPosition);
    if (!canMove) {
      vehicle.waitTime += deltaTime;
      vehicle.speed = Math.max(0, vehicle.speed - vehicle.acceleration * deltaTime);
      vehicle.state = 'waiting';
      return;
    }

    vehicle.waitTime = 0;
    vehicle.state = 'moving';

    const targetSpeed = this.calculateTargetSpeed(vehicle, targetPosition);

    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + vehicle.acceleration * deltaTime);
    } else {
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - vehicle.acceleration * deltaTime);
    }

    const moveDistance = vehicle.speed * deltaTime * 10;

    if (distance <= moveDistance) {
      vehicle.position = { ...targetPosition };
      vehicle.pathIndex++;
    } else {
      const ratio = moveDistance / distance;
      vehicle.position.x += (targetPosition.x - vehicle.position.x) * ratio;
      vehicle.position.y += (targetPosition.y - vehicle.position.y) * ratio;
    }

    vehicle.lastUpdate = Date.now();
  }

  private canVehicleMove(vehicle: Vehicle, targetPosition: { x: number; y: number }): boolean {
    const nearbyLight = this.getNearbyTrafficLight(targetPosition);
    if (nearbyLight && nearbyLight.currentState === 'red') {
      return false;
    }

    const nearbyVehicles = this.getVehiclesInArea(
      targetPosition.x - 1,
      targetPosition.y - 1,
      targetPosition.x + 1,
      targetPosition.y + 1
    );

    for (const otherVehicle of nearbyVehicles) {
      if (otherVehicle.id !== vehicle.id) {
        const distance = this.calculateDistance(targetPosition, otherVehicle.position);
        if (distance < 2) {
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

    const road = roadNetworkSystem.getRoadAt(
      Math.floor(targetPosition.x),
      Math.floor(targetPosition.y)
    );
    if (road) {
      const speedLimit = road.speedLimit / 100;
      targetSpeed = Math.min(targetSpeed, speedLimit);
    }

    const congestion = this.getCongestionAt(targetPosition.x, targetPosition.y);
    targetSpeed *= 1 - congestion * 0.7;

    if (vehicle.type === 'emergency') {
      targetSpeed = vehicle.maxSpeed;
    }

    return Math.max(0.1, targetSpeed);
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

  private getNearbyTrafficLight(position: { x: number; y: number }): TrafficLight | null {
    for (const light of this.trafficLightController.getTrafficLightMap().values()) {
      const distance = this.calculateDistance(position, light.position);
      if (distance < 2) {
        return light;
      }
    }
    return null;
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private isAtDestination(position: { x: number; y: number }, destination: { x: number; y: number }): boolean {
    return this.calculateDistance(position, destination) < 1;
  }
}
