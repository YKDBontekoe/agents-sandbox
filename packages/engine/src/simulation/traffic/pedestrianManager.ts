import { pathfindingSystem } from '../pathfinding';
import type { Pedestrian } from './types';

export class PedestrianManager {
  private pedestrians = new Map<string, Pedestrian>();
  private nextPedestrianId = 1;

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

  update(deltaTime: number): void {
    for (const pedestrian of this.pedestrians.values()) {
      this.updatePedestrianMovement(pedestrian, deltaTime);
    }
  }

  removePedestrian(pedestrianId: string): boolean {
    return this.pedestrians.delete(pedestrianId);
  }

  getAllPedestrians(): Pedestrian[] {
    return Array.from(this.pedestrians.values());
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

  private getPedestrianSpecs(age: Pedestrian['age'], mobility: Pedestrian['mobility']) {
    let baseSpeed = 0.3;

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

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private isAtDestination(position: { x: number; y: number }, destination: { x: number; y: number }): boolean {
    return this.calculateDistance(position, destination) < 1;
  }
}
