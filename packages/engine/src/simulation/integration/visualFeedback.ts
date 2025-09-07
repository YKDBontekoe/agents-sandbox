import { CitizenBehaviorSystem } from '../citizenBehavior';
import { GameplayEventsSystem, VisualIndicator } from '../gameplayEvents';
import type { EnhancedGameState, VisualFeedbackConfig } from './types';

export class VisualFeedbackSystem {
  private config: VisualFeedbackConfig;

  constructor(
    private citizenSystem: CitizenBehaviorSystem,
    private eventSystem: GameplayEventsSystem,
    config: Partial<VisualFeedbackConfig> = {}
  ) {
    this.config = {
      showBuildingStatus: true,
      showCitizenMood: true,
      showResourceFlow: true,
      showEventImpacts: true,
      showSystemHealth: true,
      ...config,
    };
  }

  generateIndicators(gameState: EnhancedGameState): VisualIndicator[] {
    const indicators: VisualIndicator[] = [];

    if (this.config.showBuildingStatus) {
      gameState.simulatedBuildings.forEach((building) => {
        if (building.condition === 'poor' || building.condition === 'critical') {
          indicators.push({
            id: `building_${building.id}`,
            type: 'building_status',
            position: { x: building.x, y: building.y },
            value: this.getConditionValue(building.condition),
            change: -1,
            color: building.condition === 'critical' ? '#ff4444' : '#ffaa44',
            icon: 'warning',
            animation: 'pulse',
            duration: 3000,
            priority: building.condition === 'critical' ? 'critical' : 'medium',
          });
        }
      });
    }

    if (this.config.showCitizenMood) {
      const communityMood = this.citizenSystem.getCommunityMood();
      if (communityMood.happiness < 30 || communityMood.stress > 70) {
        indicators.push({
          id: 'community_mood',
          type: 'citizen_mood',
          position: { x: 0, y: 0 },
          value: communityMood.happiness,
          change: communityMood.stress > 70 ? -1 : 0,
          color: communityMood.happiness < 30 ? '#ff6666' : '#ffaa66',
          icon: 'mood',
          animation: 'bounce',
          duration: 2000,
          priority: 'medium',
        });
      }
    }

    if (this.config.showEventImpacts) {
      indicators.push(...this.eventSystem.getVisualIndicators());
    }

    if (this.config.showResourceFlow) {
      Object.entries(gameState.resources).forEach(([resource, value]) => {
        if (value < 20) {
          indicators.push({
            id: `resource_${resource}`,
            type: 'resource_flow',
            position: { x: 0, y: 0 },
            value,
            change: -1,
            color: '#44aa44',
            icon: resource,
            animation: 'fade',
            duration: 1500,
            priority: 'low',
          });
        }
      });
    }

    if (this.config.showSystemHealth) {
      const { economicHealth, publicSafety, socialCohesion } = gameState.systemHealth;
      const lowest = Math.min(economicHealth, publicSafety, socialCohesion);
      if (lowest < 50) {
        indicators.push({
          id: 'system_health',
          type: 'system_health',
          position: { x: 0, y: 0 },
          value: lowest,
          change: 0,
          color: '#66aaff',
          icon: 'health',
          animation: 'pulse',
          duration: 2500,
          priority: lowest < 30 ? 'high' : 'medium',
        });
      }
    }

    return indicators;
  }

  getConfig(): VisualFeedbackConfig {
    return this.config;
  }

  private getConditionValue(condition: string): number {
    switch (condition) {
      case 'excellent':
        return 100;
      case 'good':
        return 80;
      case 'fair':
        return 60;
      case 'poor':
        return 40;
      case 'critical':
        return 20;
      default:
        return 50;
    }
  }
}

