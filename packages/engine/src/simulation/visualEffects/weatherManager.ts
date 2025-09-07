import type { GameTime } from '../../types/gameTime';
import type { WeatherEffect } from './types';

export class WeatherEffectsManager {
  private effects: Map<string, WeatherEffect> = new Map();
  private counter = 0;

  update(gameTime: GameTime): void {
    this.updateEffects();
    this.generateWeather(gameTime);
  }

  private updateEffects(): void {
    const toRemove: string[] = [];
    for (const [id, effect] of this.effects) {
      effect.duration -= 100;
      if (effect.duration <= 0) toRemove.push(id);
    }
    toRemove.forEach(id => this.effects.delete(id));
  }

  private generateWeather(gameTime: GameTime): void {
    const weatherChance = this.getWeatherChance(gameTime);
    if (Math.random() >= weatherChance || this.effects.size >= 3) return;
    const weatherType = this.selectWeatherType(gameTime);
    this.createWeatherEffect({
      type: weatherType,
      intensity: 0.3 + Math.random() * 0.4,
      coverage: { x: 0, y: 0, width: 100, height: 100 },
      duration: 10000 + Math.random() * 20000,
    });
  }

  private createWeatherEffect(params: {
    type: 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm';
    intensity: number;
    coverage: { x: number; y: number; width: number; height: number };
    duration: number;
  }): string {
    const id = `weather_${this.counter++}`;
    const config = {
      rain: { color: '#6699cc', particles: 100, visibility: 0.8, movement: 0.9, mood: -0.1 },
      snow: { color: '#ffffff', particles: 80, visibility: 0.7, movement: 0.8, mood: 0.05 },
      fog: { color: '#cccccc', particles: 50, visibility: 0.5, movement: 0.9, mood: -0.05 },
      wind: { color: '#aaaaaa', particles: 30, visibility: 1.0, movement: 1.2, mood: 0 },
      sunshine: { color: '#ffdd44', particles: 20, visibility: 1.0, movement: 1.0, mood: 0.15 },
      storm: { color: '#444466', particles: 150, visibility: 0.6, movement: 0.7, mood: -0.2 },
    } as const;
    const typeConfig = config[params.type];
    this.effects.set(id, {
      id,
      type: params.type,
      intensity: params.intensity,
      coverage: params.coverage,
      particles: Math.floor(typeConfig.particles * params.intensity),
      color: typeConfig.color,
      duration: params.duration,
      effects: {
        visibility: typeConfig.visibility,
        movement: typeConfig.movement,
        mood: typeConfig.mood * params.intensity,
      },
    });
    return id;
  }

  private getWeatherChance(gameTime: GameTime): number {
    const seasonMultipliers = {
      spring: 0.003,
      summer: 0.002,
      autumn: 0.004,
      winter: 0.005,
    } as const;
    return seasonMultipliers[gameTime.season as keyof typeof seasonMultipliers] || 0.003;
  }

  private selectWeatherType(gameTime: GameTime): WeatherEffect['type'] {
    const seasonWeather: Record<string, WeatherEffect['type'][]> = {
      spring: ['rain', 'wind', 'sunshine'],
      summer: ['sunshine', 'wind', 'storm'],
      autumn: ['rain', 'fog', 'wind'],
      winter: ['snow', 'fog', 'wind'],
    };
    const options = seasonWeather[gameTime.season] || ['wind'];
    return options[Math.floor(Math.random() * options.length)];
  }

  getEffects(): WeatherEffect[] {
    return Array.from(this.effects.values());
  }

  clear(): void {
    this.effects.clear();
  }
}
