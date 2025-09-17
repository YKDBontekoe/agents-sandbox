import type { SimResources } from '../index';
import type { GameTime } from '../types/gameTime';
import type { SimulatedBuilding } from './buildingSimulation';
import { citizenAI } from './citizenAI';
import { planActivityForGoal } from './activityPlanner';
import type { Citizen } from './citizens/citizen';
import { CitizenRegistry } from './citizens/citizenRegistry';
import { LifeEventScheduler } from './citizens/lifeEventScheduler';
import { triggerSocialInteraction } from './citizens/socialInteractions';
import { WellbeingService } from './citizens/wellbeingService';

interface CitizenUpdateState {
  buildings: SimulatedBuilding[];
  resources: SimResources;
  threatLevel: number;
  cityEvents: string[];
}

interface BehavioralEnvironment {
  buildings: SimulatedBuilding[];
  resources: SimResources;
}

export interface CitizenBehaviorDependencies {
  registry?: CitizenRegistry;
  wellbeingService?: WellbeingService;
  lifeEventScheduler?: LifeEventScheduler;
}

// Citizen behavior patterns and decision making
export class CitizenBehaviorSystem {
  private readonly registry: CitizenRegistry;
  private readonly wellbeingService: WellbeingService;
  private readonly lifeEventScheduler: LifeEventScheduler;

  constructor({
    registry,
    wellbeingService,
    lifeEventScheduler,
  }: CitizenBehaviorDependencies = {}) {
    this.registry = registry ?? new CitizenRegistry();
    this.wellbeingService = wellbeingService ?? new WellbeingService();
    this.lifeEventScheduler = lifeEventScheduler ?? new LifeEventScheduler();
  }

  // Generate a new citizen with random traits
  generateCitizen(id: string, name: string, age: number, seed: number): Citizen {
    return this.registry.createCitizen(id, name, age, seed);
  }

  // Update citizen behavior using GameTime
  updateCitizen(
    citizenId: string,
    gameTime: GameTime,
    gameState: CitizenUpdateState,
  ): void {
    const citizen = this.registry.getCitizen(citizenId);
    if (!citizen) return;

    this.wellbeingService.applyNeedsDecay(citizen);
    this.wellbeingService.updateCitizenMood(citizen, {
      threatLevel: gameState.threatLevel,
      cityEvents: gameState.cityEvents,
    });

    this.makeBehavioralDecisions(citizen, gameTime, {
      buildings: gameState.buildings,
      resources: gameState.resources,
    });

    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    this.registry.decaySocialRelationships(citizen.id, currentCycle);

    this.lifeEventScheduler.evaluateCitizen(citizen, gameTime, {
      threatLevel: gameState.threatLevel,
      cycleOverride: currentCycle,
    });
  }

  // Make behavioral decisions based on current state
  private makeBehavioralDecisions(
    citizen: Citizen,
    gameTime: GameTime,
    environment: BehavioralEnvironment,
  ): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    const hour = gameTime.hour;

    if (!citizenAI.getCitizenState(citizen.id)) {
      citizenAI.initializeCitizen(citizen);
    }

    const aiGoal = citizenAI.makeDecision(citizen, currentCycle, {
      buildings: environment.buildings,
      resources: environment.resources,
      hour,
    });

    let newActivity = citizen.currentActivity;
    let activityPlannedByAI = false;

    if (aiGoal) {
      const plan = planActivityForGoal(citizen, aiGoal);
      newActivity = plan.activity;
      activityPlannedByAI = true;
    } else {
      newActivity = this.determineActivity(citizen, hour);

      if (citizen.needs.food < 20) {
        newActivity = 'seeking_food';
      } else if (citizen.needs.social < 15 && citizen.personality.sociability > 0.7) {
        newActivity = 'socializing';
      } else if (citizen.needs.shelter < 30) {
        newActivity = 'seeking_shelter';
      }
    }

    if (newActivity !== citizen.currentActivity) {
      const previousActivity = citizen.currentActivity;
      citizen.currentActivity = newActivity;
      citizen.lastActivityChange = currentCycle;

      if (previousActivity && activityPlannedByAI) {
        const satisfaction = this.calculateActivitySatisfaction(
          citizen,
          previousActivity,
        );
        citizenAI.updateCitizenState(citizen.id, true, satisfaction);
      }

      this.executeActivity(citizen, newActivity);
    }
  }

  // Determine what activity citizen should be doing
  private determineActivity(citizen: Citizen, hour: number): string {
    const schedule = citizen.schedule;

    if (hour >= schedule.sleep.start || hour < schedule.sleep.end) {
      return 'sleeping';
    }

    if (hour >= schedule.work.start && hour < schedule.work.end && citizen.workId) {
      return 'working';
    }

    for (const meal of schedule.meals) {
      if (Math.abs(hour - meal.time) < meal.duration / 2) {
        return 'eating';
      }
    }

    for (const leisure of schedule.leisure) {
      if (hour >= leisure.start && hour < leisure.end) {
        return leisure.activity;
      }
    }

    for (const social of schedule.social) {
      if (hour >= social.start && hour < social.end) {
        return 'socializing';
      }
    }

    return 'idle';
  }

  // Execute specific activity behaviors
  private executeActivity(citizen: Citizen, activity: string): void {
    switch (activity) {
      case 'working':
        citizen.needs.purpose = Math.min(100, citizen.needs.purpose + 5);
        citizen.mood.stress = Math.min(100, citizen.mood.stress + 2);
        break;

      case 'eating':
        citizen.needs.food = Math.min(100, citizen.needs.food + 15);
        break;

      case 'socializing':
        citizen.needs.social = Math.min(100, citizen.needs.social + 10);
        triggerSocialInteraction(citizen, {
          availableTargets: this.registry.getSocialConnections(citizen.id),
          getCitizenById: id => this.registry.getCitizen(id),
        });
        break;

      case 'sleeping':
        citizen.mood.energy = Math.min(100, citizen.mood.energy + 8);
        citizen.mood.stress = Math.max(0, citizen.mood.stress - 3);
        break;

      case 'leisure':
        citizen.mood.happiness = Math.min(100, citizen.mood.happiness + 3);
        citizen.mood.stress = Math.max(0, citizen.mood.stress - 2);
        break;
    }
  }

  // Calculate satisfaction with completed activity
  private calculateActivitySatisfaction(citizen: Citizen, activity: string): number {
    let satisfaction = 50;

    switch (activity) {
      case 'working':
        satisfaction += (citizen.needs.purpose - 50) * 0.5;
        satisfaction += citizen.personality.industriousness * 30;
        break;

      case 'socializing':
        satisfaction += (citizen.needs.social - 50) * 0.8;
        satisfaction += citizen.personality.sociability * 40;
        break;

      case 'seeking_food':
        satisfaction += (citizen.needs.food - 30) * 1.0;
        break;

      case 'resting':
        satisfaction += citizen.mood.energy < 50 ? 30 : -10;
        break;

      case 'exploring':
        satisfaction += citizen.personality.curiosity * 50;
        satisfaction += (citizen.needs.purpose - 40) * 0.3;
        break;
    }

    satisfaction += (citizen.mood.happiness - 50) * 0.2;
    satisfaction -= citizen.mood.stress * 0.1;

    return Math.max(0, Math.min(100, satisfaction));
  }

  getCitizen(id: string): Citizen | undefined {
    return this.registry.getCitizen(id);
  }

  getAllCitizens(): Citizen[] {
    return this.registry.getAllCitizens();
  }

  getCommunityMood(): { happiness: number; stress: number; satisfaction: number } {
    const citizens = this.registry.getAllCitizens();
    if (citizens.length === 0) {
      return { happiness: 50, stress: 50, satisfaction: 50 };
    }

    const totalHappiness = citizens.reduce((sum, c) => sum + c.mood.happiness, 0);
    const totalStress = citizens.reduce((sum, c) => sum + c.mood.stress, 0);
    const totalSatisfaction = citizens.reduce((sum, c) => {
      const needsSat =
        (c.needs.food + c.needs.shelter + c.needs.social + c.needs.purpose + c.needs.safety) /
        5;
      return sum + needsSat;
    }, 0);

    return {
      happiness: totalHappiness / citizens.length,
      stress: totalStress / citizens.length,
      satisfaction: totalSatisfaction / citizens.length,
    };
  }
}

export type { Citizen } from './citizens/citizen';
