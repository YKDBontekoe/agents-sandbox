import { TransportStop, TransportRoute, TransportVehicle, Passenger, TransportType } from './types';

export class VehicleManager {
  constructor(
    private stops: Map<string, TransportStop>,
    private routes: Map<string, TransportRoute>,
    private vehicles: Map<string, TransportVehicle>,
    private passengers: Map<string, Passenger>
  ) {}

  spawnVehiclesForRoute(route: TransportRoute): void {
    const vehicleCount = Math.max(1, Math.floor(route.stops.length / 3));

    for (let i = 0; i < vehicleCount; i++) {
      const startStop = this.stops.get(route.stops[0]);
      const vehicle: TransportVehicle = {
        id: `${route.id}_vehicle_${i}`,
        type: route.type,
        routeId: route.id,
        currentStopIndex: Math.floor(i * route.stops.length / vehicleCount),
        nextStopIndex: 0,
        position: startStop ? startStop.position : { x: 0, y: 0 },
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

  updateVehicles(deltaTime: number): void {
    this.vehicles.forEach(vehicle => {
      const route = this.routes.get(vehicle.routeId);
      if (!route) return;

      const currentStop = this.stops.get(route.stops[vehicle.currentStopIndex]);
      const nextStop = this.stops.get(route.stops[vehicle.nextStopIndex]);
      if (!currentStop || !nextStop) return;

      const dx = nextStop.position.x - vehicle.position.x;
      const dy = nextStop.position.y - vehicle.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.5) {
        vehicle.position = nextStop.position;
        vehicle.currentStopIndex = vehicle.nextStopIndex;
        vehicle.nextStopIndex = (vehicle.nextStopIndex + 1) % route.stops.length;
        this.handleStopOperations(vehicle, nextStop);
      } else {
        const moveDistance = vehicle.speed * deltaTime * (vehicle.condition / 100);
        vehicle.position.x += (dx / distance) * moveDistance;
        vehicle.position.y += (dy / distance) * moveDistance;
      }

      vehicle.condition = Math.max(0, vehicle.condition - 0.001 * deltaTime);
      vehicle.fuel = Math.max(0, vehicle.fuel - 0.01 * deltaTime);
    });
  }

  private handleStopOperations(vehicle: TransportVehicle, stop: TransportStop): void {
    vehicle.passengers = vehicle.passengers.filter(passenger => {
      if (passenger.destination === stop.id) {
        this.passengers.delete(passenger.id);
        return false;
      }
      return true;
    });

    const availableSpace = vehicle.capacity - vehicle.passengers.length;
    const boardingPassengers = stop.waitingPassengers.splice(0, availableSpace);

    boardingPassengers.forEach(passenger => {
      vehicle.passengers.push(passenger);
      stop.currentPassengers++;
    });
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
}
