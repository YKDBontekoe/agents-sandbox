import type { GameTime } from '../../types/gameTime';
import type { EffectGameState, TrafficFlow } from './types';
import type { SimulatedBuilding } from '../buildingSimulation';

export class TrafficEffectsManager {
  private flows: Map<string, TrafficFlow> = new Map();
  private counter = 0;

  update(gameTime: GameTime, state: EffectGameState, config: { max: number }): void {
    this.updateFlows();
    if (this.flows.size >= config.max) return;
    this.generateFromActivity(state, gameTime);
  }

  private updateFlows(): void {
    const toRemove: string[] = [];
    for (const [id, flow] of this.flows) {
      flow.duration -= 100; // assume caller regulates interval
      if (flow.duration <= 0) toRemove.push(id);
    }
    toRemove.forEach(id => this.flows.delete(id));
  }

  private generateFromActivity(state: EffectGameState, gameTime: GameTime): void {
    const activeBuildings = state.buildings.filter(b => b.condition !== 'critical' && b.utilityEfficiency > 0.3);
    const timeMultiplier = this.getTimeActivityMultiplier(gameTime);
    const trafficIntensity = Math.min(state.citizens.length / 100, 1) * timeMultiplier;
    if (Math.random() < trafficIntensity * 0.3) {
      this.createFlow({
        from: this.getRandomBuildingPosition(activeBuildings),
        to: this.getRandomBuildingPosition(activeBuildings),
        type: 'pedestrian',
        intensity: trafficIntensity,
        duration: 3000 + Math.random() * 2000,
      });
    }

    const tradeActivity = this.calculateTradeActivity(state);
    if (Math.random() < tradeActivity * 0.2) {
      this.createFlow({
        from: this.getRandomBuildingPosition(activeBuildings),
        to: this.getRandomBuildingPosition(activeBuildings),
        type: 'goods',
        intensity: tradeActivity,
        duration: 4000 + Math.random() * 3000,
      });
    }
  }

  private createFlow(params: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
    intensity: number;
    duration: number;
  }): string {
    const id = `traffic_${this.counter++}`;
    const colors = {
      pedestrian: '#4a90e2',
      goods: '#f5a623',
      construction: '#ff8800',
      emergency: '#ff4444',
    } as const;
    const speeds = {
      pedestrian: 1.0,
      goods: 0.7,
      construction: 0.5,
      emergency: 2.0,
    } as const;
    this.flows.set(id, {
      id,
      from: params.from,
      to: params.to,
      intensity: params.intensity,
      type: params.type,
      color: colors[params.type],
      speed: speeds[params.type],
      particles: Math.floor(params.intensity * 10) + 3,
      duration: params.duration,
    });
    return id;
  }

  private getTimeActivityMultiplier(gameTime: GameTime): number {
    const timeMultipliers = {
      morning: 0.8,
      afternoon: 1.0,
      evening: 0.7,
      night: 0.3,
    } as const;
    return timeMultipliers[gameTime.timeOfDay as keyof typeof timeMultipliers] ?? 0.5;
  }

  private calculateTradeActivity(state: EffectGameState): number {
    const tradeBuildings = state.buildings.filter(
      b => b.typeId === 'trade_post' || b.typeId === 'market'
    );
    const totalEfficiency = tradeBuildings.reduce(
      (sum, b) => sum + b.utilityEfficiency,
      0
    );
    return Math.min(totalEfficiency / tradeBuildings.length || 0, 1);
  }

  private getRandomBuildingPosition(buildings: SimulatedBuilding[]): { x: number; y: number } {
    if (buildings.length === 0) {
      return { x: Math.random() * 100, y: Math.random() * 100 };
    }
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    return { x: building.x, y: building.y };
  }

  getFlows(): TrafficFlow[] {
    return Array.from(this.flows.values());
  }

  clear(): void {
    this.flows.clear();
  }
}
