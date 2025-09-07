import type { GameTime } from '../../types/gameTime';
import type { EffectGameState, ActivityIndicator } from './types';

export class ActivityEffectsManager {
  private indicators: Map<string, ActivityIndicator> = new Map();
  private counter = 0;

  update(gameTime: GameTime, state: EffectGameState, config: { max: number }): void {
    this.updateIndicators();
    if (this.indicators.size >= config.max) return;
    this.generateIndicators(state);
  }

  private updateIndicators(): void {
    const toRemove: string[] = [];
    for (const [id, indicator] of this.indicators) {
      indicator.duration -= 100;
      if (indicator.duration <= 0) toRemove.push(id);
    }
    toRemove.forEach(id => this.indicators.delete(id));
  }

  private generateIndicators(state: EffectGameState): void {
    state.buildings.forEach(building => {
      if (building.utilityEfficiency > 0.7 && Math.random() < 0.08) {
        this.createIndicator({
          position: { x: building.x, y: building.y },
          type: 'productivity',
          value: building.utilityEfficiency,
          trend: building.utilityEfficiency > 0.8 ? 'increasing' : 'stable',
          duration: 2000 + Math.random() * 1000,
        });
      }
    });

    if (state.citizens.length > 0 && Math.random() < 0.05) {
      const avgHappiness =
        state.citizens.reduce((sum, c) => sum + (c.mood?.happiness || 50), 0) /
        Math.max(state.citizens.length, 1);
      if (avgHappiness > 60) {
        this.createIndicator({
          position: this.getRandomCityPosition(),
          type: 'happiness',
          value: avgHappiness / 100,
          trend: avgHappiness > 70 ? 'increasing' : 'stable',
          duration: 3000 + Math.random() * 2000,
        });
      }
    }

    const tradeActivity = this.calculateTradeActivity(state);
    if (tradeActivity > 0.5 && Math.random() < 0.06) {
      this.createIndicator({
        position: this.getRandomCityPosition(),
        type: 'trade',
        value: tradeActivity,
        trend: 'increasing',
        duration: 2500 + Math.random() * 1500,
      });
    }
  }

  private createIndicator(params: {
    position: { x: number; y: number };
    type: 'productivity' | 'happiness' | 'trade' | 'growth' | 'maintenance';
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    duration: number;
  }): string {
    const id = `activity_${this.counter++}`;
    const config = {
      productivity: { color: '#00aa44', icon: 'gear', animation: 'spin' as const },
      happiness: { color: '#ffaa00', icon: 'smile', animation: 'bounce' as const },
      trade: { color: '#4488ff', icon: 'exchange', animation: 'pulse' as const },
      growth: { color: '#aa44ff', icon: 'arrow-up', animation: 'float' as const },
      maintenance: { color: '#ff8844', icon: 'wrench', animation: 'glow' as const },
    } as const;
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
      duration: params.duration,
    });
    return id;
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

  private getRandomCityPosition(): { x: number; y: number } {
    return { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 };
  }

  getIndicators(): ActivityIndicator[] {
    return Array.from(this.indicators.values());
  }

  clear(): void {
    this.indicators.clear();
  }
}
