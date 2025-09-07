import { roadNetworkSystem } from '../roadNetwork';
import type { TrafficLight } from './types';

export class TrafficLightController {
  private trafficLights = new Map<string, TrafficLight>();

  update(deltaTime: number): void {
    roadNetworkSystem.updateTrafficLights(deltaTime);

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

        light.timeInState += deltaTime;
        light.direction = intersection.currentPhase === 'north-south' ? 'north-south' : 'east-west';
        light.currentState = intersection.currentPhase === 'all-stop' ? 'red' : 'green';
      }
    }
  }

  getTrafficLights(): TrafficLight[] {
    return Array.from(this.trafficLights.values());
  }

  getTrafficLightMap(): Map<string, TrafficLight> {
    return this.trafficLights;
  }
}
