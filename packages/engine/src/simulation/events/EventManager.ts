import type { SimResources } from '../../index';
import type { SimulatedBuilding } from '../buildingSimulation';
import type { Citizen } from '../citizenBehavior';
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

export class EventManager {
  private activeEvents: Map<string, ActiveEvent> = new Map();
  private eventHistory: ActiveEvent[] = [];
  private visualIndicators: Map<string, VisualIndicator> = new Map();
  private systemState: SystemState = {
    population: 0,
    happiness: 50,
    economicHealth: 50,
    infrastructure: 50,
    resources: 50,
    stability: 50
  };
  private eventIdCounter = 0;

  // Update events system each cycle
  updateEvents(
    gameTime: GameTime,
    gameState: {
      buildings: SimulatedBuilding[];
      citizens: Citizen[];
      workers: WorkerProfile[];
      resources: SimResources;
    }
  ): void {
    // Update system state
    this.updateSystemState(gameState);

    // Process active events
    this.processActiveEvents(gameTime);

    // Check for new events
    this.checkForNewEvents(gameTime);

    // Update visual indicators
    this.updateVisualIndicators();

    // Check for interconnected effects
    this.processInterconnectedEffects(gameTime);
  }

  // Update system state based on game conditions
  private updateSystemState(gameState: {
    buildings: SimulatedBuilding[];
    citizens: Citizen[];
    workers: WorkerProfile[];
    resources: SimResources;
  }): void {
    // Population
    this.systemState.population = gameState.citizens.length;

    // Happiness (average citizen mood)
    const totalHappiness = gameState.citizens.reduce(
      (sum, c) => sum + c.mood.happiness,
      0
    );
    this.systemState.happiness =
      gameState.citizens.length > 0
        ? totalHappiness / gameState.citizens.length
        : 50;

    // Economic health (based on resources and worker satisfaction)
    const resourceScore = Math.min(100, (gameState.resources.coin || 0) / 2);
    const workerSatisfaction =
      gameState.workers.length > 0
        ?
            gameState.workers.reduce((sum, w) => sum + w.jobSatisfaction, 0) /
            gameState.workers.length
        : 50;
    this.systemState.economicHealth = (resourceScore + workerSatisfaction) / 2;

    // Infrastructure (average building condition)
    const conditionValues = { excellent: 100, good: 80, fair: 60, poor: 40, critical: 20 };
    const avgCondition =
      gameState.buildings.length > 0
        ?
            gameState.buildings.reduce(
              (sum, b) => sum + conditionValues[b.condition],
              0
            ) / gameState.buildings.length
        : 50;
    this.systemState.infrastructure = avgCondition;

    // Resources (normalized resource availability)
    const totalResources =
      (gameState.resources.coin || 0) +
      (gameState.resources.grain || 0) +
      (gameState.resources.planks || 0) +
      (gameState.resources.mana || 0);
    this.systemState.resources = Math.min(100, totalResources / 5);

    // Stability (inverse of stress and unrest)
    const avgStress =
      gameState.citizens.length > 0
        ?
            gameState.citizens.reduce((sum, c) => sum + c.mood.stress, 0) /
            gameState.citizens.length
        : 30;
    this.systemState.stability = Math.max(0, 100 - avgStress);
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

  // Check for new random events
  private checkForNewEvents(gameTime: GameTime): void {
    for (const [eventType, eventDef] of Object.entries(EVENT_DEFINITIONS)) {
      // Adjust probability based on system state
      let adjustedProbability = eventDef.impact.probability;

      // System state influences event probability
      switch (eventType as EventType) {
        case 'social_unrest':
          if (this.systemState.happiness < 40) adjustedProbability *= 2;
          if (this.systemState.stability < 30) adjustedProbability *= 1.5;
          break;
        case 'plague_outbreak':
          if (this.systemState.population > 50) adjustedProbability *= 1.3;
          if (this.systemState.infrastructure < 40) adjustedProbability *= 1.2;
          break;
        case 'economic_boom':
          if (this.systemState.economicHealth > 70) adjustedProbability *= 1.5;
          break;
        case 'technological_breakthrough':
          if (this.systemState.resources > 60) adjustedProbability *= 1.2;
          break;
      }

      // Check if event should trigger
      if (Math.random() < adjustedProbability) {
        this.triggerEvent(eventType as EventType, gameTime);
      }
    }
  }

  // Trigger a specific event
  triggerEvent(eventType: EventType, gameTime: GameTime): string {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60); // Convert GameTime to cycle
    const eventDef = EVENT_DEFINITIONS[eventType];
    const eventId = `event_${this.eventIdCounter++}`;

    const event: ActiveEvent = {
      id: eventId,
      ...eventDef,
      startCycle: currentCycle,
      endCycle: currentCycle + eventDef.impact.duration,
      isActive: true
    };

    this.activeEvents.set(eventId, event);

    // Create visual indicator
    this.createVisualIndicator({
      type: 'event_impact',
      position: { x: 0, y: 0 },
      value: this.getEventImpactScore(event),
      change: 1,
      color: event.color,
      icon: event.type,
      animation: event.animationType,
      duration: 5,
      priority: event.severity === 'critical' ? 'critical' : event.severity === 'major' ? 'high' : 'medium'
    });

    return eventId;
  }

  // Process interconnected effects between systems
  private processInterconnectedEffects(gameTime: GameTime): void {
    for (const event of this.activeEvents.values()) {
      if (event.triggers) {
        for (const trigger of event.triggers) {
          if (
            this.checkTriggerCondition(trigger.condition) &&
            Math.random() < trigger.probability
          ) {
            this.triggerEvent(trigger.eventType, gameTime);
          }
        }
      }
    }
  }

  // Check if trigger condition is met
  private checkTriggerCondition(condition: string): boolean {
    switch (condition) {
      case 'low_infrastructure':
        return this.systemState.infrastructure < 40;
      case 'high_trade':
        return this.systemState.economicHealth > 70;
      case 'high_population_density':
        return this.systemState.population > 40;
      default:
        return false;
    }
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

  // Calculate event impact score for visual feedback
  private getEventImpactScore(event: ActiveEvent): number {
    const resourceImpact = Object.values(event.impact.resources).reduce(
      (sum, val) => sum + Math.abs(val || 0),
      0
    );
    const moodImpact =
      Math.abs(event.impact.citizenMood.happiness) +
      Math.abs(event.impact.citizenMood.stress) +
      Math.abs(event.impact.citizenMood.motivation);
    const economicImpact = Math.abs((event.impact.economicEffects.growthRate || 0) * 2);

    return Math.min(100, resourceImpact / 10 + moodImpact + economicImpact);
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
