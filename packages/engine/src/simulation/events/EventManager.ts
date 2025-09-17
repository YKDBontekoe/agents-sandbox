import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildings';
import type { Citizen } from '../citizens/citizen';
import type { WorkerProfile } from '../workers/types';
import type { GameTime } from '../../types/gameTime';
import { EVENT_DEFINITIONS } from './definitions';
import type {
  ActiveEvent,
  VisualIndicator,
  EventType,
  SystemState,
  EventImpact
} from './types';
import {
  DEFAULT_SYSTEM_STATE,
  computeSystemState,
  type SimulationSnapshot
} from './systemState';
import { buildEventIndicator, generateEventCandidates, type EventCandidate } from './eventGeneration';

export class EventManager {
  private activeEvents: Map<string, ActiveEvent> = new Map();
  private eventHistory: ActiveEvent[] = [];
  private visualIndicators: Map<string, VisualIndicator> = new Map();
  private systemState: SystemState = { ...DEFAULT_SYSTEM_STATE };
  private eventIdCounter = 0;

  // Update events system each cycle
  updateEvents(gameTime: GameTime, gameState: SimulationSnapshot): void {
    this.systemState = computeSystemState(gameState);

    this.processActiveEvents(gameTime);

    const candidates = generateEventCandidates({
      systemState: this.systemState,
      activeEvents: this.activeEvents.values(),
      eventDefinitions: EVENT_DEFINITIONS
    });

    for (const candidate of candidates) {
      this.activateCandidate(candidate, gameTime);
    }

    this.updateVisualIndicators();
  }

  // Process currently active events
  private processActiveEvents(gameTimeOrCycle: GameTime | number): void {
    const currentCycle =
      typeof gameTimeOrCycle === 'number'
        ? gameTimeOrCycle
        : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    for (const [eventId, event] of this.activeEvents) {
      if (currentCycle >= event.endCycle) {
        // Event has ended
        event.isActive = false;
        this.eventHistory.push(event);
        this.activeEvents.delete(eventId);

        // Create visual indicator for event end
        this.createVisualIndicator({
          type: 'event_impact',
          position: { x: 0, y: 0 },
          value: 0,
          change: -1,
          color: event.color,
          icon: 'event_end',
          animation: 'fade_out',
          duration: 3,
          priority: 'medium'
        });
      }
    }
  }

  private activateCandidate(candidate: EventCandidate, gameTime: GameTime): string {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    const eventId = `event_${this.eventIdCounter++}`;

    const event: ActiveEvent = {
      id: eventId,
      ...candidate.definition,
      startCycle: currentCycle,
      endCycle: currentCycle + candidate.definition.impact.duration,
      isActive: true
    };

    this.activeEvents.set(eventId, event);
    this.createVisualIndicator(candidate.indicator);

    return eventId;
  }

  // Trigger a specific event
  triggerEvent(eventType: EventType, gameTime: GameTime): string {
    const eventDef = EVENT_DEFINITIONS[eventType];
    if (!eventDef) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    const candidate: EventCandidate = {
      type: eventType,
      definition: eventDef,
      reason: 'manual',
      indicator: buildEventIndicator(eventDef, 'manual')
    };

    return this.activateCandidate(candidate, gameTime);
  }

  // Update visual indicators
  private updateVisualIndicators(): void {
    const toRemove: string[] = [];

    for (const [id, indicator] of this.visualIndicators) {
      indicator.duration--;
      if (indicator.duration <= 0) {
        toRemove.push(id);
      }
    }

    toRemove.forEach(id => this.visualIndicators.delete(id));
  }

  // Create visual indicator
  private createVisualIndicator(params: Omit<VisualIndicator, 'id'>): string {
    const id = `indicator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const indicator: VisualIndicator = { id, ...params };
    this.visualIndicators.set(id, indicator);
    return id;
  }

  // Apply event effects to game state
  applyEventEffects(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
    }): {
      resourceChanges: Partial<SimResources>;
      buildingEffects: Array<{
        buildingId: string;
        effects: {
          conditionChange: number;
          efficiencyMultiplier: number;
          maintenanceCostMultiplier: number;
        };
      }>;
      citizenEffects: Array<{
        citizenId: string;
        effects: {
          happinessChange: number;
          stressChange: number;
          motivationChange: number;
        };
      }>;
    } {
      const resourceChanges: Partial<SimResources> = {};
      const buildingEffects: Array<{
        buildingId: string;
        effects: {
          conditionChange: number;
          efficiencyMultiplier: number;
          maintenanceCostMultiplier: number;
        };
      }> = [];
      const citizenEffects: Array<{
        citizenId: string;
        effects: {
          happinessChange: number;
          stressChange: number;
          motivationChange: number;
        };
      }> = [];

    for (const event of this.activeEvents.values()) {
      // Apply resource changes
      for (const [resource, amount] of Object.entries(event.impact.resources)) {
        resourceChanges[resource as keyof SimResources] =
          (resourceChanges[resource as keyof SimResources] || 0) + (amount || 0);
      }

      // Apply building effects
      for (const building of gameState.buildings) {
        buildingEffects.push({
          buildingId: building.id,
          effects: {
            conditionChange: event.impact.buildingEffects.conditionChange,
            efficiencyMultiplier: event.impact.buildingEffects.efficiencyMultiplier,
            maintenanceCostMultiplier:
              event.impact.buildingEffects.maintenanceCostMultiplier
          }
        });
      }

      // Apply citizen mood effects
      for (const citizen of gameState.citizens) {
        citizenEffects.push({
          citizenId: citizen.id,
          effects: {
            happinessChange: event.impact.citizenMood.happiness,
            stressChange: event.impact.citizenMood.stress,
            motivationChange: event.impact.citizenMood.motivation
          }
        });
      }
    }

    return { resourceChanges, buildingEffects, citizenEffects };
  }

  // Handle player response to event
  respondToEvent(
    eventId: string,
    responseId: string,
    gameState: { resources: SimResources }
  ): { success: boolean; message: string; effects?: Partial<EventImpact> } {
    const event = this.activeEvents.get(eventId);
    if (!event || !event.responses) {
      return { success: false, message: 'Event not found or no responses available' };
    }

    const response = event.responses.find(r => r.id === responseId);
    if (!response) {
      return { success: false, message: 'Response option not found' };
    }

    // Check if player can afford the response
    for (const [resource, cost] of Object.entries(response.cost)) {
      if ((gameState.resources[resource as keyof SimResources] || 0) < (cost || 0)) {
        return { success: false, message: `Insufficient ${resource}` };
      }
    }

    // Apply response effects
    if (response.effect) {
      // Modify the event's impact
      if (response.effect.citizenMood) {
        event.impact.citizenMood.happiness += response.effect.citizenMood.happiness || 0;
        event.impact.citizenMood.stress += response.effect.citizenMood.stress || 0;
        event.impact.citizenMood.motivation += response.effect.citizenMood.motivation || 0;
      }

      if (response.effect.buildingEffects) {
        event.impact.buildingEffects.conditionChange +=
          response.effect.buildingEffects.conditionChange || 0;
        event.impact.buildingEffects.efficiencyMultiplier *=
          response.effect.buildingEffects.efficiencyMultiplier || 1;
      }

      if (response.effect.duration) {
        event.endCycle += response.effect.duration;
      }
    }

    return {
      success: true,
      message: `Response applied: ${response.description}`,
      effects: response.effect
    };
  }

  // Get current system health for UI display
  getSystemHealth(): SystemState & {
    overallHealth: number;
    criticalIssues: string[];
    recommendations: string[];
  } {
    const overallHealth =
      (this.systemState.happiness +
        this.systemState.economicHealth +
        this.systemState.infrastructure +
        this.systemState.stability) /
      4;

    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    if (this.systemState.happiness < 30) {
      criticalIssues.push('Low citizen happiness');
      recommendations.push('Address citizen needs and concerns');
    }

    if (this.systemState.infrastructure < 40) {
      criticalIssues.push('Poor infrastructure condition');
      recommendations.push('Invest in building maintenance and upgrades');
    }

    if (this.systemState.economicHealth < 35) {
      criticalIssues.push('Economic instability');
      recommendations.push('Focus on resource generation and trade');
    }

    if (this.systemState.stability < 40) {
      criticalIssues.push('Social instability');
      recommendations.push('Reduce citizen stress and improve living conditions');
    }

    return {
      ...this.systemState,
      overallHealth,
      criticalIssues,
      recommendations
    };
  }

  // Public getters
  getActiveEvents(): ActiveEvent[] {
    return Array.from(this.activeEvents.values());
  }

  getEventHistory(): ActiveEvent[] {
    return [...this.eventHistory];
  }

  getVisualIndicators(): VisualIndicator[] {
    return Array.from(this.visualIndicators.values());
  }

  getSystemState(): SystemState {
    return { ...this.systemState };
  }
}
