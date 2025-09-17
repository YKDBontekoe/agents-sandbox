import type { VisualEffectsGameState, ConstructionAnimation, ConstructionEffectsConfig } from './types';

const DEFAULT_CONSTRUCTION_CONFIG: ConstructionEffectsConfig = {
  enabled: true,
  maxAnimations: 20
};

export class ConstructionEffectsManager {
  private animations: Map<string, ConstructionAnimation> = new Map();
  private config: ConstructionEffectsConfig = { ...DEFAULT_CONSTRUCTION_CONFIG };

  constructor(config?: Partial<ConstructionEffectsConfig>) {
    if (config) {
      this.updateConfig(config);
    }
  }

  updateConfig(config: Partial<ConstructionEffectsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(currentTime: number): void {
    if (!this.config.enabled || this.animations.size === 0) {
      return;
    }

    const toRemove: string[] = [];

    for (const [id, animation] of this.animations) {
      const elapsed = currentTime - animation.startTime;
      animation.progress = Math.min(elapsed / animation.duration, 1);

      if (animation.progress >= 1) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.animations.delete(id));
  }

  generate(gameState: VisualEffectsGameState, currentTime: number): void {
    if (!this.config.enabled || this.animations.size >= this.config.maxAnimations) {
      return;
    }

    gameState.buildings.forEach(building => {
      const animationId = `construction_${building.id}`;

      if ((building.condition === 'poor' || building.condition === 'critical') && !this.animations.has(animationId)) {
        if (Math.random() < 0.1) {
          this.createConstructionAnimation({
            buildingId: building.id,
            position: { x: building.x, y: building.y },
            type: 'repairing',
            duration: 8000 + Math.random() * 5000,
            startTime: currentTime
          });
        }
      }

      if (building.utilityEfficiency > 0.8 && !this.animations.has(animationId)) {
        if (Math.random() < 0.05) {
          this.createConstructionAnimation({
            buildingId: building.id,
            position: { x: building.x, y: building.y },
            type: 'upgrading',
            duration: 12000 + Math.random() * 8000,
            startTime: currentTime
          });
        }
      }
    });
  }

  getAnimations(): ConstructionAnimation[] {
    return Array.from(this.animations.values());
  }

  clear(): void {
    this.animations.clear();
  }

  private createConstructionAnimation(params: {
    buildingId: string;
    position: { x: number; y: number };
    type: ConstructionAnimation['type'];
    duration: number;
    startTime: number;
  }): string {
    const id = `construction_${params.buildingId}`;

    const effects: Record<ConstructionAnimation['type'], ConstructionAnimation['effects']> = {
      building: { dust: true, sparks: false, machinery: true, workers: 3 },
      upgrading: { dust: false, sparks: true, machinery: true, workers: 2 },
      repairing: { dust: true, sparks: true, machinery: false, workers: 2 },
      demolishing: { dust: true, sparks: false, machinery: true, workers: 1 }
    };

    this.animations.set(id, {
      id,
      buildingId: params.buildingId,
      position: params.position,
      type: params.type,
      progress: 0,
      effects: effects[params.type],
      duration: params.duration,
      startTime: params.startTime
    });

    return id;
  }
}
