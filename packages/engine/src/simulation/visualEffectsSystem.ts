import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizens/citizen';
import type { WorkerProfile } from './workers/types';

export interface TrafficFlow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number; // 0-1
  type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
  color: string;
  speed: number;
  particles: number;
  duration: number;
}

export interface ConstructionAnimation {
  id: string;
  buildingId: string;
  position: { x: number; y: number };
  type: 'building' | 'upgrading' | 'repairing' | 'demolishing';
  progress: number; // 0-1
  effects: {
    dust: boolean;
    sparks: boolean;
    machinery: boolean;
    workers: number;
  };
  duration: number;
  startTime: number;
}

export interface ActivityIndicator {
  id: string;
  position: { x: number; y: number };
  type: 'productivity' | 'happiness' | 'trade' | 'growth' | 'maintenance';
  value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  color: string;
  icon: string;
  animation: 'pulse' | 'bounce' | 'glow' | 'float' | 'spin';
  intensity: number; // 0-1
  duration: number;
}

export interface WeatherEffect {
  id: string;
  type: 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm';
  intensity: number; // 0-1
  coverage: { x: number; y: number; width: number; height: number };
  particles: number;
  color: string;
  duration: number;
  effects: {
    visibility: number; // 0-1
    movement: number; // speed modifier
    mood: number; // citizen mood modifier
  };
}

interface GameTime {
  totalMinutes: number;
  day: number;
  hour: number;
  minute: number;
  season: string;
  timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
}

export class VisualEffectsSystem {
  private trafficFlows: Map<string, TrafficFlow> = new Map();
  private constructionAnimations: Map<string, ConstructionAnimation> = new Map();
  private activityIndicators: Map<string, ActivityIndicator> = new Map();
  private weatherEffects: Map<string, WeatherEffect> = new Map();
  private effectIdCounter = 0;
  private lastUpdateTime = 0;

  // Configuration
  private config = {
    trafficEnabled: true,
    constructionEnabled: true,
    activityEnabled: true,
    weatherEnabled: true,
    maxTrafficFlows: 50,
    maxConstructionAnimations: 20,
    maxActivityIndicators: 30,
    updateInterval: 100, // ms
  };

  updateEffects(gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime < this.config.updateInterval) {
      return;
    }
    this.lastUpdateTime = currentTime;

    // Update existing effects
    this.updateTrafficFlows();
    this.updateConstructionAnimations();
    this.updateActivityIndicators();
    this.updateWeatherEffects();

    // Generate new effects based on game state
    this.generateTrafficFromActivity(gameState, gameTime);
    this.generateConstructionAnimations(gameState);
    this.generateActivityIndicators(gameState);
    this.generateWeatherEffects(gameTime);
  }

  private updateTrafficFlows(): void {
    const toRemove: string[] = [];
    
    for (const [id, flow] of this.trafficFlows) {
      flow.duration -= this.config.updateInterval;
      if (flow.duration <= 0) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.trafficFlows.delete(id));
  }

  private updateConstructionAnimations(): void {
    const toRemove: string[] = [];
    
    for (const [id, animation] of this.constructionAnimations) {
      const elapsed = Date.now() - animation.startTime;
      animation.progress = Math.min(elapsed / animation.duration, 1);
      
      if (animation.progress >= 1) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.constructionAnimations.delete(id));
  }

  private updateActivityIndicators(): void {
    const toRemove: string[] = [];
    
    for (const [id, indicator] of this.activityIndicators) {
      indicator.duration -= this.config.updateInterval;
      if (indicator.duration <= 0) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.activityIndicators.delete(id));
  }

  private updateWeatherEffects(): void {
    const toRemove: string[] = [];
    
    for (const [id, effect] of this.weatherEffects) {
      effect.duration -= this.config.updateInterval;
      if (effect.duration <= 0) {
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.weatherEffects.delete(id));
  }

  private generateTrafficFromActivity(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }, gameTime: GameTime): void {
    if (!this.config.trafficEnabled || this.trafficFlows.size >= this.config.maxTrafficFlows) {
      return;
    }

    // Generate traffic between active buildings
    const activeBuildings = gameState.buildings.filter(b => 
      b.condition !== 'critical' && b.utilityEfficiency > 0.3
    );

    // Generate traffic based on citizen activity and building workers
    const trafficDensity = activeBuildings.reduce((total, building) => {
      const utilityEff = building.utilityEfficiency || 0.8;
      return total + (building.workers || 0) * utilityEff;
    }, 0);

    // Create pedestrian traffic based on time of day and building activity
    const timeMultiplier = this.getTimeActivityMultiplier(gameTime);
    const trafficIntensity =
      Math.min((gameState.citizens.length + trafficDensity) / 100, 1) *
      timeMultiplier;

    if (Math.random() < trafficIntensity * 0.3) {
      this.createTrafficFlow({
        from: this.getRandomBuildingPosition(activeBuildings),
        to: this.getRandomBuildingPosition(activeBuildings),
        type: 'pedestrian',
        intensity: trafficIntensity,
        duration: 3000 + Math.random() * 2000
      });
    }

    // Create goods traffic based on trade activity
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

  private generateConstructionAnimations(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    if (!this.config.constructionEnabled || this.constructionAnimations.size >= this.config.maxConstructionAnimations) {
      return;
    }

    // Find buildings under construction or repair
    gameState.buildings.forEach(building => {
      const animationId = `construction_${building.id}`;
      
      // Check if building needs repair
      if (building.condition === 'poor' || building.condition === 'critical') {
        if (!this.constructionAnimations.has(animationId) && Math.random() < 0.1) {
          this.createConstructionAnimation({
            buildingId: building.id,
            position: { x: building.x, y: building.y },
            type: 'repairing',
            duration: 8000 + Math.random() * 5000
          });
        }
      }
      
      // Check for upgrades (high efficiency buildings)
      if (building.utilityEfficiency > 0.8 && Math.random() < 0.05) {
        if (!this.constructionAnimations.has(animationId)) {
          this.createConstructionAnimation({
            buildingId: building.id,
            position: { x: building.x, y: building.y },
            type: 'upgrading',
            duration: 12000 + Math.random() * 8000
          });
        }
      }
    });
  }

  private generateActivityIndicators(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    if (!this.config.activityEnabled || this.activityIndicators.size >= this.config.maxActivityIndicators) {
      return;
    }

    // Generate productivity indicators
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

    // Generate happiness indicators based on citizen mood
    if (gameState.citizens.length > 0 && Math.random() < 0.05) {
      // Calculate citizen happiness effect on activity
      const avgHappiness = gameState.citizens.reduce((sum, citizen) => {
        return sum + (citizen.mood?.happiness || 50);
      }, 0) / Math.max(gameState.citizens.length, 1);
      
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

    // Generate trade indicators
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

  private generateWeatherEffects(gameTime: GameTime): void {
    if (!this.config.weatherEnabled) return;

    // Generate weather based on season and time
    const weatherChance = this.getWeatherChance(gameTime);
    
    if (Math.random() < weatherChance && this.weatherEffects.size < 3) {
      const weatherType = this.selectWeatherType(gameTime);
      this.createWeatherEffect({
        type: weatherType,
        intensity: 0.3 + Math.random() * 0.4,
        coverage: { x: 0, y: 0, width: 100, height: 100 },
        duration: 10000 + Math.random() * 20000
      });
    }
  }

  private createTrafficFlow(params: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: 'pedestrian' | 'goods' | 'construction' | 'emergency';
    intensity: number;
    duration: number;
  }): string {
    const id = `traffic_${this.effectIdCounter++}`;
    
    const colors = {
      pedestrian: '#4a90e2',
      goods: '#f5a623',
      construction: '#ff8800',
      emergency: '#ff4444'
    };

    const speeds = {
      pedestrian: 1.0,
      goods: 0.7,
      construction: 0.5,
      emergency: 2.0
    };

    this.trafficFlows.set(id, {
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

  private createConstructionAnimation(params: {
    buildingId: string;
    position: { x: number; y: number };
    type: 'building' | 'upgrading' | 'repairing' | 'demolishing';
    duration: number;
  }): string {
    const id = `construction_${params.buildingId}`;
    
    const effects = {
      building: { dust: true, sparks: false, machinery: true, workers: 3 },
      upgrading: { dust: false, sparks: true, machinery: true, workers: 2 },
      repairing: { dust: true, sparks: true, machinery: false, workers: 2 },
      demolishing: { dust: true, sparks: false, machinery: true, workers: 1 }
    };

    this.constructionAnimations.set(id, {
      id,
      buildingId: params.buildingId,
      position: params.position,
      type: params.type,
      progress: 0,
      effects: effects[params.type],
      duration: params.duration,
      startTime: Date.now()
    });

    return id;
  }

  private createActivityIndicator(params: {
    position: { x: number; y: number };
    type: 'productivity' | 'happiness' | 'trade' | 'growth' | 'maintenance';
    value: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    duration: number;
  }): string {
    const id = `activity_${this.effectIdCounter++}`;
    
    const config = {
      productivity: { color: '#00aa44', icon: 'gear', animation: 'spin' as const },
      happiness: { color: '#ffaa00', icon: 'smile', animation: 'bounce' as const },
      trade: { color: '#4488ff', icon: 'exchange', animation: 'pulse' as const },
      growth: { color: '#aa44ff', icon: 'arrow-up', animation: 'float' as const },
      maintenance: { color: '#ff8844', icon: 'wrench', animation: 'glow' as const }
    };

    this.activityIndicators.set(id, {
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

  private createWeatherEffect(params: {
    type: 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm';
    intensity: number;
    coverage: { x: number; y: number; width: number; height: number };
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
    };

    const typeConfig = config[params.type];
    
    this.weatherEffects.set(id, {
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

  // Helper methods
  private getTimeActivityMultiplier(gameTime: GameTime): number {
    const hourMultipliers = {
      dawn: 0.3,
      morning: 0.8,
      midday: 1.0,
      afternoon: 0.9,
      evening: 0.7,
      night: 0.2
    };
    return hourMultipliers[gameTime.timeOfDay] || 0.5;
  }

  private calculateTradeActivity(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): number {
    const tradeBuildings = gameState.buildings.filter(b => 
      b.typeId === 'trade_post' || b.typeId === 'market'
    );
    const totalEfficiency = tradeBuildings.reduce((sum, b) => sum + b.utilityEfficiency, 0);
    return Math.min(totalEfficiency / tradeBuildings.length || 0, 1);
  }

  private getRandomBuildingPosition(buildings: SimulatedBuilding[]): { x: number; y: number } {
    if (buildings.length === 0) {
      return { x: Math.random() * 100, y: Math.random() * 100 };
    }
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    return { x: building.x, y: building.y };
  }

  private getRandomCityPosition(): { x: number; y: number } {
    return {
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60
    };
  }

  private getWeatherChance(gameTime: GameTime): number {
    const seasonMultipliers = {
      spring: 0.003,
      summer: 0.002,
      autumn: 0.004,
      winter: 0.005
    };
    return seasonMultipliers[gameTime.season as keyof typeof seasonMultipliers] || 0.003;
  }

  private selectWeatherType(gameTime: GameTime): 'rain' | 'snow' | 'fog' | 'wind' | 'sunshine' | 'storm' {
    const seasonWeather = {
      spring: ['rain', 'wind', 'sunshine'],
      summer: ['sunshine', 'wind', 'storm'],
      autumn: ['rain', 'fog', 'wind'],
      winter: ['snow', 'fog', 'wind']
    };
    
    const options = seasonWeather[gameTime.season as keyof typeof seasonWeather] || ['wind'];
    return options[Math.floor(Math.random() * options.length)] as WeatherEffect['type'];
  }

  // Public getters
  getTrafficFlows(): TrafficFlow[] {
    return Array.from(this.trafficFlows.values());
  }

  getConstructionAnimations(): ConstructionAnimation[] {
    return Array.from(this.constructionAnimations.values());
  }

  getActivityIndicators(): ActivityIndicator[] {
    return Array.from(this.activityIndicators.values());
  }

  getWeatherEffects(): WeatherEffect[] {
    return Array.from(this.weatherEffects.values());
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

  // Configuration methods
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): typeof this.config {
    return { ...this.config };
  }

  // Cleanup methods
  clearAllEffects(): void {
    this.trafficFlows.clear();
    this.constructionAnimations.clear();
    this.activityIndicators.clear();
    this.weatherEffects.clear();
  }

  clearEffectsByType(type: 'traffic' | 'construction' | 'activity' | 'weather'): void {
    switch (type) {
      case 'traffic':
        this.trafficFlows.clear();
        break;
      case 'construction':
        this.constructionAnimations.clear();
        break;
      case 'activity':
        this.activityIndicators.clear();
        break;
      case 'weather':
        this.weatherEffects.clear();
        break;
    }
  }
}
