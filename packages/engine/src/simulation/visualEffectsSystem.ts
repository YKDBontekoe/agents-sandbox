import type { GameTime } from '../types/gameTime';
import { ActivityEffectsManager } from './effects/activityEffectsManager';
import { ConstructionEffectsManager } from './effects/constructionEffectsManager';
import type {
  ActivityIndicator,
  ConstructionAnimation,
  TrafficFlow,
  VisualEffectsGameState,
  WeatherEffect
} from './effects/types';
import { WeatherEffectsManager } from './effects/weatherEffectsManager';
import { TrafficEffectsManager } from './effects/trafficEffectsManager';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizens/citizen';
import type { SimResources } from '../index';
import type { WorkerProfile } from './workers/types';

export type { TrafficFlow, ConstructionAnimation, ActivityIndicator, WeatherEffect } from './effects/types';

interface VisualEffectsUpdateState {
  buildings: SimulatedBuilding[];
  citizens: Citizen[];
  workers: WorkerProfile[];
  resources: SimResources;
}

export class VisualEffectsSystem {
  private readonly trafficManager = new TrafficEffectsManager();
  private readonly constructionManager = new ConstructionEffectsManager();
  private readonly activityManager = new ActivityEffectsManager();
  private readonly weatherManager = new WeatherEffectsManager();

  private lastUpdateTime = 0;

  private config = {
    trafficEnabled: true,
    constructionEnabled: true,
    activityEnabled: true,
    weatherEnabled: true,
    maxTrafficFlows: 50,
    maxConstructionAnimations: 20,
    maxActivityIndicators: 30,
    maxWeatherEffects: 3,
    updateInterval: 100
  };

  constructor() {
    this.syncManagerConfig();
  }

  updateEffects(gameTime: GameTime, gameState: VisualEffectsUpdateState): void {
    const currentTime = Date.now();
    const elapsed = this.lastUpdateTime === 0 ? this.config.updateInterval : currentTime - this.lastUpdateTime;

    if (elapsed < this.config.updateInterval) {
      return;
    }

    this.lastUpdateTime = currentTime;

    const effectsGameState: VisualEffectsGameState = {
      buildings: gameState.buildings,
      citizens: gameState.citizens,
      workers: gameState.workers,
      resources: gameState.resources
    };

    this.trafficManager.update(elapsed);
    this.constructionManager.update(currentTime);
    this.activityManager.update(elapsed);
    this.weatherManager.update(elapsed);

    this.trafficManager.generate(effectsGameState, gameTime);
    this.constructionManager.generate(effectsGameState, currentTime);
    this.activityManager.generate(effectsGameState);
    this.weatherManager.generate(gameTime);
  }

  getTrafficFlows(): TrafficFlow[] {
    return this.trafficManager.getFlows();
  }

  getConstructionAnimations(): ConstructionAnimation[] {
    return this.constructionManager.getAnimations();
  }

  getActivityIndicators(): ActivityIndicator[] {
    return this.activityManager.getIndicators();
  }

  getWeatherEffects(): WeatherEffect[] {
    return this.weatherManager.getEffects();
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
      weather: this.getWeatherEffects()
    };
  }

  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    this.syncManagerConfig();
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  clearAllEffects(): void {
    this.trafficManager.clear();
    this.constructionManager.clear();
    this.activityManager.clear();
    this.weatherManager.clear();
  }

  clearEffectsByType(type: 'traffic' | 'construction' | 'activity' | 'weather'): void {
    switch (type) {
      case 'traffic':
        this.trafficManager.clear();
        break;
      case 'construction':
        this.constructionManager.clear();
        break;
      case 'activity':
        this.activityManager.clear();
        break;
      case 'weather':
        this.weatherManager.clear();
        break;
    }
  }

  private syncManagerConfig(): void {
    this.trafficManager.updateConfig({
      enabled: this.config.trafficEnabled,
      maxFlows: this.config.maxTrafficFlows
    });

    this.constructionManager.updateConfig({
      enabled: this.config.constructionEnabled,
      maxAnimations: this.config.maxConstructionAnimations
    });

    this.activityManager.updateConfig({
      enabled: this.config.activityEnabled,
      maxIndicators: this.config.maxActivityIndicators
    });

    this.weatherManager.updateConfig({
      enabled: this.config.weatherEnabled,
      maxConcurrent: this.config.maxWeatherEffects
    });
  }
}
