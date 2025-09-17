import type { GameTime } from '../../types/gameTime';
import type { VisualEffectsGameState, TrafficFlow, TrafficEffectsConfig } from './types';

const DEFAULT_TRAFFIC_CONFIG: TrafficEffectsConfig = {
  enabled: true,
  maxFlows: 50
};

export class TrafficEffectsManager {
  private flows: Map<string, TrafficFlow> = new Map();
  private config: TrafficEffectsConfig = { ...DEFAULT_TRAFFIC_CONFIG };
  private effectIdCounter = 0;

  constructor(config?: Partial<TrafficEffectsConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  updateConfig(config: Partial<TrafficEffectsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(elapsedMs: number): void {
    if (!this.config.enabled || this.flows.size === 0) {
      return;
    }

    const toRemove: string[] = [];

    for (const [id, flow] of this.flows) {
      flow.duration -= elapsedMs;
      if (flow.duration <= 0) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.flows.delete(id));
  }

  generate(gameState: VisualEffectsGameState, gameTime: GameTime): void {
    if (!this.config.enabled || this.flows.size >= this.config.maxFlows) {
      return;
    }

    const activeBuildings = gameState.buildings.filter(
      building => building.condition !== 'critical' && building.utilityEfficiency > 0.3
    );

    if (activeBuildings.length === 0) {
      return;
    }

    const trafficDensity = activeBuildings.reduce((total, building) => {
      const utilityEff = building.utilityEfficiency || 0.8;
      return total + (building.workers || 0) * utilityEff;
    }, 0);

    const timeMultiplier = this.getTimeActivityMultiplier(gameTime);
    const trafficIntensity =
      Math.min((gameState.citizens.length + trafficDensity) / 100, 1) * timeMultiplier;

    if (Math.random() < trafficIntensity * 0.3) {
      this.createTrafficFlow({
        from: this.getRandomBuildingPosition(activeBuildings),
        to: this.getRandomBuildingPosition(activeBuildings),
        type: 'pedestrian',
        intensity: trafficIntensity,
        duration: 3000 + Math.random() * 2000
      });
    }

    const tradeActivity = this.calculateTradeActivity(gameState);
    if (Math.random() < tradeActivity * 0.2) {
      this.createTrafficFlow({
        from: this.getRandomBuildingPosition(activeBuildings),
        to: this.getRandomBuildingPosition(activeBuildings),
        type: 'goods',
        intensity: tradeActivity,
        duration: 4000 + Math.random() * 3000
      });
    }
  }

  getFlows(): TrafficFlow[] {
    return Array.from(this.flows.values());
  }

  clear(): void {
    this.flows.clear();
  }

  private createTrafficFlow(params: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: TrafficFlow['type'];
    intensity: number;
    duration: number;
  }): string {
    const id = `traffic_${this.effectIdCounter++}`;

    const colors: Record<TrafficFlow['type'], string> = {
      pedestrian: '#4a90e2',
      goods: '#f5a623',
      construction: '#ff8800',
      emergency: '#ff4444'
    };

    const speeds: Record<TrafficFlow['type'], number> = {
      pedestrian: 1.0,
      goods: 0.7,
      construction: 0.5,
      emergency: 2.0
    };

    this.flows.set(id, {
      id,
      from: params.from,
      to: params.to,
      intensity: params.intensity,
      type: params.type,
      color: colors[params.type],
      speed: speeds[params.type],
      particles: Math.floor(params.intensity * 10) + 3,
      duration: params.duration
    });

    return id;
  }

  private getTimeActivityMultiplier(gameTime: GameTime): number {
    const hourMultipliers: Record<string, number> = {
      dawn: 0.3,
      morning: 0.8,
      midday: 1.0,
      afternoon: 0.9,
      evening: 0.7,
      night: 0.2
    };

    return hourMultipliers[gameTime.timeOfDay] ?? 0.5;
  }

  private calculateTradeActivity(gameState: VisualEffectsGameState): number {
    const tradeBuildings = gameState.buildings.filter(
      building => building.typeId === 'trade_post' || building.typeId === 'market'
    );

    if (tradeBuildings.length === 0) {
      return 0;
    }

    const totalEfficiency = tradeBuildings.reduce(
      (sum, building) => sum + building.utilityEfficiency,
      0
    );

    return Math.min(totalEfficiency / tradeBuildings.length, 1);
  }

  private getRandomBuildingPosition(buildings: VisualEffectsGameState['buildings']): {
    x: number;
    y: number;
  } {
    if (buildings.length === 0) {
      return { x: Math.random() * 100, y: Math.random() * 100 };
    }

    const building = buildings[Math.floor(Math.random() * buildings.length)];
    return { x: building.x, y: building.y };
  }
}
