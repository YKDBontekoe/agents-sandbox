import type { GameTime } from '../../types/gameTime';
import type { WeatherEffect, WeatherEffectsConfig } from './types';

const DEFAULT_WEATHER_CONFIG: WeatherEffectsConfig = {
  enabled: true,
  maxConcurrent: 3
};

export class WeatherEffectsManager {
  private effects: Map<string, WeatherEffect> = new Map();
  private config: WeatherEffectsConfig = { ...DEFAULT_WEATHER_CONFIG };
  private effectIdCounter = 0;

  constructor(config?: Partial<WeatherEffectsConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  updateConfig(config: Partial<WeatherEffectsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(elapsedMs: number): void {
    if (!this.config.enabled || this.effects.size === 0) {
      return;
    }

    const toRemove: string[] = [];

    for (const [id, effect] of this.effects) {
      effect.duration -= elapsedMs;
      if (effect.duration <= 0) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.effects.delete(id));
  }

  generate(gameTime: GameTime): void {
    if (!this.config.enabled || this.effects.size >= this.config.maxConcurrent) {
      return;
    }

    const weatherChance = this.getWeatherChance(gameTime);
    if (Math.random() >= weatherChance) {
      return;
    }

    const weatherType = this.selectWeatherType(gameTime);
    this.createWeatherEffect({
      type: weatherType,
      intensity: 0.3 + Math.random() * 0.4,
      coverage: { x: 0, y: 0, width: 100, height: 100 },
      duration: 10000 + Math.random() * 20000
    });
  }

  getEffects(): WeatherEffect[] {
    return Array.from(this.effects.values());
  }

  clear(): void {
    this.effects.clear();
  }

  private createWeatherEffect(params: {
    type: WeatherEffect['type'];
    intensity: number;
    coverage: WeatherEffect['coverage'];
    duration: number;
  }): string {
    const id = `weather_${this.effectIdCounter++}`;

    const config = {
      rain: { color: '#6699cc', particles: 100, visibility: 0.8, movement: 0.9, mood: -0.1 },
      snow: { color: '#ffffff', particles: 80, visibility: 0.7, movement: 0.8, mood: 0.05 },
      fog: { color: '#cccccc', particles: 50, visibility: 0.5, movement: 0.9, mood: -0.05 },
      wind: { color: '#aaaaaa', particles: 30, visibility: 1.0, movement: 1.2, mood: 0 },
      sunshine: { color: '#ffdd44', particles: 20, visibility: 1.0, movement: 1.0, mood: 0.15 },
      storm: { color: '#444466', particles: 150, visibility: 0.6, movement: 0.7, mood: -0.2 }
    } satisfies Record<WeatherEffect['type'], {
      color: string;
      particles: number;
      visibility: number;
      movement: number;
      mood: number;
    }>;

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
        mood: typeConfig.mood * params.intensity
      }
    });

    return id;
  }

  private getWeatherChance(gameTime: GameTime): number {
    const seasonMultipliers: Record<string, number> = {
      spring: 0.003,
      summer: 0.002,
      autumn: 0.004,
      winter: 0.005
    };

    return seasonMultipliers[gameTime.season] ?? 0.003;
  }

  private selectWeatherType(gameTime: GameTime): WeatherEffect['type'] {
    const seasonWeather: Record<string, WeatherEffect['type'][]> = {
      spring: ['rain', 'wind', 'sunshine'],
      summer: ['sunshine', 'wind', 'storm'],
      autumn: ['rain', 'fog', 'wind'],
      winter: ['snow', 'fog', 'wind']
    };

    const options = seasonWeather[gameTime.season] ?? ['wind'];
    return options[Math.floor(Math.random() * options.length)];
  }
}
