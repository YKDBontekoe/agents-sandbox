import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import { citizenAI } from './citizenAI';
import type { PathfindingGoal } from './ai/types';
import type { GameTime } from '../types/gameTime';
import { createCitizen } from './citizens/citizenFactory';
import type { Citizen } from './citizens/citizen';
import type { CitizenMood } from './citizens/types';
import { updateNeeds, updateMood } from './citizens/citizenWellbeing';
import { triggerSocialInteraction } from './citizens/socialInteractions';
import { maybeTriggerLifeEvent } from './citizens/lifeEvents';

// Citizen behavior patterns and decision making
export class CitizenBehaviorSystem {
  private citizens: Map<string, Citizen> = new Map();
  private socialNetwork: Map<string, Set<string>> = new Map();
  private communityEvents: Array<{
    cycle: number;
    type: string;
    participants: string[];
    impact: Partial<CitizenMood>;
  }> = [];
  private citizenGoals: Map<string, PathfindingGoal> = new Map();

  // Generate a new citizen with random traits
  generateCitizen(
    id: string,
    name: string,
    age: number,
    seed: number
  ): Citizen {
    const citizen = createCitizen({ id, name, age, seed });

    this.citizens.set(id, citizen);
    this.socialNetwork.set(id, new Set());

    return citizen;
  }

  // Update citizen behavior using GameTime
  updateCitizen(citizenId: string, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    threatLevel: number;
    cityEvents: string[];
  }): void {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) return;

    // Update needs decay
    updateNeeds(citizen);

    // Update mood based on needs and circumstances
    updateMood(citizen, {
      threatLevel: gameState.threatLevel,
      cityEvents: gameState.cityEvents
    });
    
    // Make behavioral decisions
    this.makeBehavioralDecisions(citizen, gameTime, gameState);
    
    // Update social relationships
    this.updateSocialRelationships(citizen, gameTime);
    
    // Check for life events
    this.checkForLifeEvents(citizen, gameTime, gameState);
  }

  // Make behavioral decisions based on current state
  private makeBehavioralDecisions(citizen: Citizen, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
  }): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    const hour = gameTime.hour; // Use actual game hour
    
    // Initialize citizen in enhanced AI if not already done
    if (!citizenAI.getCitizenState(citizen.id)) {
      citizenAI.initializeCitizen(citizen);
    }
    
    // Use enhanced AI to make decisions
    const aiGoal = citizenAI.makeDecision(citizen, currentCycle, {
      buildings: gameState.buildings,
      resources: gameState.resources,
      hour
    });
    
    let newActivity: string;

    if (aiGoal) {
      // Store the goal for tracking
      this.citizenGoals.set(citizen.id, aiGoal);

      // Convert AI goal to activity and location
      newActivity = this.convertGoalToActivity(aiGoal);

      // Apply dynamic pathfinding - move towards target with purpose
      this.updateCitizenMovement(citizen, aiGoal);
    } else {
      // Fallback to traditional behavior for edge cases
      newActivity = this.determineActivity(citizen, hour);
      
      // Override with urgent needs (but less rigidly than before)
      if (citizen.needs.food < 20) {
        newActivity = 'seeking_food';
      } else if (citizen.needs.social < 15 && citizen.personality.sociability > 0.7) {
        newActivity = 'socializing';
      } else if (citizen.needs.shelter < 30) {
        newActivity = 'seeking_shelter';
      }
    }

    // Update activity if changed
    if (newActivity !== citizen.currentActivity) {
      const previousActivity = citizen.currentActivity;
      citizen.currentActivity = newActivity;
      citizen.lastActivityChange = currentCycle;
      
      // Calculate satisfaction with previous activity
      if (previousActivity && aiGoal) {
        const satisfaction = this.calculateActivitySatisfaction(citizen, previousActivity);
        citizenAI.updateCitizenState(citizen.id, true, satisfaction);
      }
      
      // Trigger activity-specific behaviors
      this.executeActivity(citizen, newActivity);
    }
  }

  // Determine what activity citizen should be doing
  private determineActivity(citizen: Citizen, hour: number): string {
    const schedule = citizen.schedule;
    
    // Check sleep time
    if (hour >= schedule.sleep.start || hour < schedule.sleep.end) {
      return 'sleeping';
    }
    
    // Check work time
    if (hour >= schedule.work.start && hour < schedule.work.end && citizen.workId) {
      return 'working';
    }
    
    // Check meal times
    for (const meal of schedule.meals) {
      if (Math.abs(hour - meal.time) < meal.duration / 2) {
        return 'eating';
      }
    }
    
    // Check leisure activities
    for (const leisure of schedule.leisure) {
      if (hour >= leisure.start && hour < leisure.end) {
        return leisure.activity;
      }
    }
    
    // Check social time
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
          availableTargets: Array.from(this.socialNetwork.get(citizen.id) || []),
          getCitizenById: id => this.citizens.get(id)
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

  // Update social relationships
  private updateSocialRelationships(citizen: Citizen, gameTime: GameTime): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    for (const relationship of citizen.relationships) {
      const daysSinceInteraction = currentCycle - relationship.lastInteraction;
      
      // Relationships decay over time without interaction
      if (daysSinceInteraction > 7) {
        relationship.strength = Math.max(0, relationship.strength - 1);
      }
      
      // Remove very weak relationships
      if (relationship.strength < 10) {
        const index = citizen.relationships.indexOf(relationship);
        citizen.relationships.splice(index, 1);
      }
    }
  }

  // Check for life events
  private checkForLifeEvents(citizen: Citizen, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    threatLevel: number;
  }): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);

    maybeTriggerLifeEvent(citizen, gameTime, {
      threatLevel: gameState.threatLevel,
      eventChance: 0.02,
      cycleOverride: currentCycle
    });
  }
  // Convert AI pathfinding goal to citizen activity
  private convertGoalToActivity(goal: PathfindingGoal): string {
    switch (goal.purpose) {
      case 'work':
        return 'working';
      case 'home':
        return 'resting';
      case 'social':
        return 'socializing';
      case 'resource':
        return 'seeking_food';
      case 'explore':
        return 'exploring';
      case 'emergency':
        return 'seeking_shelter';
      default:
        return 'idle';
    }
  }

  // Update citizen movement towards AI goal with dynamic pathfinding
  private updateCitizenMovement(citizen: Citizen, goal: PathfindingGoal): void {
    const currentPos = citizen.location;
    const targetPos = goal.target;
    
    // Calculate distance to target
    const distance = Math.hypot(targetPos.x - currentPos.x, targetPos.y - currentPos.y);
    
    if (distance > 1) {
      // Move towards target with speed based on urgency and citizen energy
      const baseSpeed = 0.5;
      const urgencyMultiplier = 1 + (goal.urgency / 100);
      const energyMultiplier = citizen.mood.energy / 100;
      const speed = baseSpeed * urgencyMultiplier * energyMultiplier;
      
      // Calculate movement direction
      const dirX = (targetPos.x - currentPos.x) / distance;
      const dirY = (targetPos.y - currentPos.y) / distance;
      
      // Add some randomness to avoid perfectly straight lines
      const randomFactor = 0.1;
      const randomX = (Math.random() - 0.5) * randomFactor;
      const randomY = (Math.random() - 0.5) * randomFactor;
      
      // Update position
      citizen.location = {
        x: currentPos.x + (dirX + randomX) * speed,
        y: currentPos.y + (dirY + randomY) * speed
      };
      
      // Check if we should try alternatives if stuck
      if (distance < 0.1 && goal.alternatives.length > 0) {
        const alternative = goal.alternatives[0];
        goal.target = { x: alternative.x, y: alternative.y };
      }
    }
  }

  // Calculate satisfaction with completed activity
  private calculateActivitySatisfaction(citizen: Citizen, activity: string): number {
    let satisfaction = 50; // Base satisfaction
    
    // Adjust based on how well the activity met citizen needs
    switch (activity) {
      case 'working':
        satisfaction += (citizen.needs.purpose - 50) * 0.5;
        satisfaction += (citizen.personality.industriousness * 30);
        break;
      
      case 'socializing':
        satisfaction += (citizen.needs.social - 50) * 0.8;
        satisfaction += (citizen.personality.sociability * 40);
        break;
      
      case 'seeking_food':
        satisfaction += (citizen.needs.food - 30) * 1.0;
        break;
      
      case 'resting':
        satisfaction += (citizen.mood.energy < 50 ? 30 : -10);
        break;
      
      case 'exploring':
        satisfaction += (citizen.personality.curiosity * 50);
        satisfaction += (citizen.needs.purpose - 40) * 0.3;
        break;
    }
    
    // Adjust based on citizen mood
    satisfaction += (citizen.mood.happiness - 50) * 0.2;
    satisfaction -= citizen.mood.stress * 0.1;
    
    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, satisfaction));
  }

  // Public methods for external access
  getCitizen(id: string): Citizen | undefined {
    return this.citizens.get(id);
  }

  getAllCitizens(): Citizen[] {
    return Array.from(this.citizens.values());
  }

  getCommunityMood(): { happiness: number; stress: number; satisfaction: number } {
    const citizens = this.getAllCitizens();
    if (citizens.length === 0) return { happiness: 50, stress: 50, satisfaction: 50 };
    
    const totalHappiness = citizens.reduce((sum, c) => sum + c.mood.happiness, 0);
    const totalStress = citizens.reduce((sum, c) => sum + c.mood.stress, 0);
    const totalSatisfaction = citizens.reduce((sum, c) => {
      const needsSat = (c.needs.food + c.needs.shelter + c.needs.social + c.needs.purpose + c.needs.safety) / 5;
      return sum + needsSat;
    }, 0);
    
    return {
      happiness: totalHappiness / citizens.length,
      stress: totalStress / citizens.length,
      satisfaction: totalSatisfaction / citizens.length
    };
  }
}