import type { VisualEffectsGameState, ActivityIndicator, ActivityEffectsConfig } from './types';

const DEFAULT_ACTIVITY_CONFIG: ActivityEffectsConfig = {
  enabled: true,
  maxIndicators: 30
};

export class ActivityEffectsManager {
  private indicators: Map<string, ActivityIndicator> = new Map();
  private config: ActivityEffectsConfig = { ...DEFAULT_ACTIVITY_CONFIG };
  private effectIdCounter = 0;

  constructor(config?: Partial<ActivityEffectsConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  updateConfig(config: Partial<ActivityEffectsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(elapsedMs: number): void {
    if (!this.config.enabled || this.indicators.size === 0) {
      return;
    }

    const toRemove: string[] = [];

    for (const [id, indicator] of this.indicators) {
      indicator.duration -= elapsedMs;
      if (indicator.duration <= 0) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.indicators.delete(id));
  }

  generate(gameState: VisualEffectsGameState): void {
    if (!this.config.enabled || this.indicators.size >= this.config.maxIndicators) {
      return;
    }

    gameState.buildings.forEach(building => {
      if (building.utilityEfficiency > 0.7 && Math.random() < 0.08) {
        this.createActivityIndicator({
          position: { x: building.x, y: building.y },
          type: 'productivity',
          value: building.utilityEfficiency,
          trend: building.utilityEfficiency > 0.8 ? 'increasing' : 'stable',
          duration: 2000 + Math.random() * 1000
        });
      }
    });

    if (gameState.citizens.length > 0 && Math.random() < 0.05) {
      const avgHappiness =
        gameState.citizens.reduce((sum, citizen) => sum + (citizen.mood?.happiness || 50), 0) /
        Math.max(gameState.citizens.length, 1);

      if (avgHappiness > 60) {
        this.createActivityIndicator({
          position: this.getRandomCityPosition(),
          type: 'happiness',
          value: avgHappiness / 100,
          trend: avgHappiness > 70 ? 'increasing' : 'stable',
          duration: 3000 + Math.random() * 2000
        });
      }
    }

    const tradeActivity = this.calculateTradeActivity(gameState);
    if (tradeActivity > 0.5 && Math.random() < 0.06) {
      this.createActivityIndicator({
        position: this.getRandomCityPosition(),
        type: 'trade',
        value: tradeActivity,
        trend: 'increasing',
        duration: 2500 + Math.random() * 1500
      });
    }
  }

  getIndicators(): ActivityIndicator[] {
    return Array.from(this.indicators.values());
  }

  clear(): void {
    this.indicators.clear();
  }

  private createActivityIndicator(params: {
    position: { x: number; y: number };
    type: ActivityIndicator['type'];
    value: number;
    trend: ActivityIndicator['trend'];
    duration: number;
  }): string {
    const id = `activity_${this.effectIdCounter++}`;

    const config = {
      productivity: { color: '#00aa44', icon: 'gear', animation: 'spin' as const },
      happiness: { color: '#ffaa00', icon: 'smile', animation: 'bounce' as const },
      trade: { color: '#4488ff', icon: 'exchange', animation: 'pulse' as const },
      growth: { color: '#aa44ff', icon: 'arrow-up', animation: 'float' as const },
      maintenance: { color: '#ff8844', icon: 'wrench', animation: 'glow' as const }
    } satisfies Record<ActivityIndicator['type'], { color: string; icon: string; animation: ActivityIndicator['animation'] }>;

    this.indicators.set(id, {
      id,
      position: params.position,
      type: params.type,
      value: params.value,
      trend: params.trend,
      color: config[params.type].color,
      icon: config[params.type].icon,
      animation: config[params.type].animation,
      intensity: params.value,
      duration: params.duration
    });

    return id;
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

  private getRandomCityPosition(): { x: number; y: number } {
    return {
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60
    };
  }
}
