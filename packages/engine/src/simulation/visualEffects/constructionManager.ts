import type { GameTime } from '../../types/gameTime';
import type { EffectGameState, ConstructionAnimation } from './types';

export class ConstructionEffectsManager {
  private animations: Map<string, ConstructionAnimation> = new Map();

  update(gameTime: GameTime, state: EffectGameState, config: { max: number }): void {
    this.updateAnimations();
    if (this.animations.size >= config.max) return;
    this.generateAnimations(state);
  }

  private updateAnimations(): void {
    const toRemove: string[] = [];
    for (const [id, animation] of this.animations) {
      const elapsed = Date.now() - animation.startTime;
      animation.progress = Math.min(elapsed / animation.duration, 1);
      if (animation.progress >= 1) toRemove.push(id);
    }
    toRemove.forEach(id => this.animations.delete(id));
  }

  private generateAnimations(state: EffectGameState): void {
    state.buildings.forEach(building => {
      const animationId = `construction_${building.id}`;
      if (this.animations.has(animationId)) return;
      if (building.condition === 'poor' || building.condition === 'critical') {
        if (Math.random() < 0.1) {
          this.createAnimation({
            buildingId: building.id,
            position: { x: building.x, y: building.y },
            type: 'repairing',
            duration: 8000 + Math.random() * 5000,
          });
        }
      } else if (building.utilityEfficiency > 0.8 && Math.random() < 0.05) {
        this.createAnimation({
          buildingId: building.id,
          position: { x: building.x, y: building.y },
          type: 'upgrading',
          duration: 12000 + Math.random() * 8000,
        });
      }
    });
  }

  private createAnimation(params: {
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
      demolishing: { dust: true, sparks: false, machinery: true, workers: 1 },
    } as const;
    this.animations.set(id, {
      id,
      buildingId: params.buildingId,
      position: params.position,
      type: params.type,
      progress: 0,
      effects: effects[params.type],
      duration: params.duration,
      startTime: Date.now(),
    });
    return id;
  }

  getAnimations(): ConstructionAnimation[] {
    return Array.from(this.animations.values());
  }

  clear(): void {
    this.animations.clear();
  }
}
