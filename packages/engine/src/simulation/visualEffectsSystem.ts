import type { GameTime } from '../types/gameTime';
import type { TrafficFlow, ConstructionAnimation, ActivityIndicator, WeatherEffect, EffectGameState } from './visualEffects/types';
import { TrafficEffectsManager } from './visualEffects/trafficManager';
import { ConstructionEffectsManager } from './visualEffects/constructionManager';
import { ActivityEffectsManager } from './visualEffects/activityManager';
import { WeatherEffectsManager } from './visualEffects/weatherManager';

export class VisualEffectsSystem {
  private traffic = new TrafficEffectsManager();
  private construction = new ConstructionEffectsManager();
  private activity = new ActivityEffectsManager();
  private weather = new WeatherEffectsManager();
  private lastUpdateTime = 0;

  private config = {
    trafficEnabled: true,
    constructionEnabled: true,
    activityEnabled: true,
    weatherEnabled: true,
    maxTrafficFlows: 50,
    maxConstructionAnimations: 20,
    maxActivityIndicators: 30,
    updateInterval: 100,
  };

  updateEffects(gameTime: GameTime, gameState: EffectGameState): void {
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime < this.config.updateInterval) return;
    this.lastUpdateTime = currentTime;

    if (this.config.trafficEnabled) {
      this.traffic.update(gameTime, gameState, { max: this.config.maxTrafficFlows });
    }
    if (this.config.constructionEnabled) {
      this.construction.update(gameTime, gameState, { max: this.config.maxConstructionAnimations });
    }
    if (this.config.activityEnabled) {
      this.activity.update(gameTime, gameState, { max: this.config.maxActivityIndicators });
    }
    if (this.config.weatherEnabled) {
      this.weather.update(gameTime);
    }
  }

  getTrafficFlows(): TrafficFlow[] {
    return this.traffic.getFlows();
  }

  getConstructionAnimations(): ConstructionAnimation[] {
    return this.construction.getAnimations();
  }

  getActivityIndicators(): ActivityIndicator[] {
    return this.activity.getIndicators();
  }

  getWeatherEffects(): WeatherEffect[] {
    return this.weather.getEffects();
  }

  getAllVisualEffects(): {
    traffic: TrafficFlow[];
    construction: ConstructionAnimation[];
    activity: ActivityIndicator[];
    weather: WeatherEffect[];
  } {
    return {
      traffic: this.getTrafficFlows(),
      construction: this.getConstructionAnimations(),
      activity: this.getActivityIndicators(),
      weather: this.getWeatherEffects(),
    };
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  clearAllEffects(): void {
    this.traffic.clear();
    this.construction.clear();
    this.activity.clear();
    this.weather.clear();
  }

  clearEffectsByType(type: 'traffic' | 'construction' | 'activity' | 'weather'): void {
    switch (type) {
      case 'traffic':
        this.traffic.clear();
        break;
      case 'construction':
        this.construction.clear();
        break;
      case 'activity':
        this.activity.clear();
        break;
      case 'weather':
        this.weather.clear();
        break;
    }
  }
}
