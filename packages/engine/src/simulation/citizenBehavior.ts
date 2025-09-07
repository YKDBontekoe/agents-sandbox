import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import { citizenAI } from './citizenAI';
import type { PathfindingGoal } from './ai/types';
import type { GameTime } from '../types/gameTime';

// Personality traits that influence citizen behavior
export interface PersonalityTraits {
  ambition: number; // 0-1, affects career progression desire
  sociability: number; // 0-1, affects social interaction frequency
  industriousness: number; // 0-1, affects work efficiency and overtime willingness
  contentment: number; // 0-1, affects happiness baseline and needs sensitivity
  curiosity: number; // 0-1, affects exploration and learning behaviors
}

// Basic needs that citizens must fulfill
export interface CitizenNeeds {
  food: number; // 0-100, decreases over time, fulfilled by grain access
  shelter: number; // 0-100, decreases slowly, fulfilled by housing quality
  social: number; // 0-100, decreases over time, fulfilled by interactions
  purpose: number; // 0-100, decreases over time, fulfilled by meaningful work
  safety: number; // 0-100, affected by city threat level and crime
}

// Citizen mood and satisfaction
export interface CitizenMood {
  happiness: number; // 0-100, overall life satisfaction
  stress: number; // 0-100, work and life pressure
  energy: number; // 0-100, physical and mental energy
  motivation: number; // 0-100, drive to work and contribute
}

// Social relationships between citizens
export interface SocialRelationship {
  targetId: string;
  type: 'family' | 'friend' | 'colleague' | 'rival' | 'romantic';
  strength: number; // 0-100, relationship closeness
  lastInteraction: number; // cycle of last interaction
  interactionHistory: Array<{
    cycle: number;
    type: 'positive' | 'negative' | 'neutral';
    context: string;
  }>;
}

// Daily activity schedule
export interface DailySchedule {
  sleep: { start: number; end: number }; // hours 0-24
  work: { start: number; end: number };
  meals: Array<{ time: number; duration: number }>;
  leisure: Array<{ start: number; end: number; activity: string }>;
  social: Array<{ start: number; end: number; targetId?: string }>;
}

// Citizen life goals and aspirations
export interface LifeGoals {
  careerAspiration: string; // desired job type
  socialGoals: Array<{ type: string; target?: string; priority: number }>;
  materialGoals: Array<{ item: string; priority: number }>;
  personalGrowth: Array<{ skill: string; currentLevel: number; targetLevel: number }>;
}

// Complete citizen definition
export interface Citizen {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  
  // Core attributes
  personality: PersonalityTraits;
  needs: CitizenNeeds;
  mood: CitizenMood;
  
  // Life situation
  homeId?: string; // building ID where they live
  workId?: string; // building ID where they work
  jobTitle: string;
  skills: Record<string, number>; // skill name -> level (0-100)
  
  // Social connections
  relationships: SocialRelationship[];
  familyMembers: string[]; // citizen IDs
  
  // Behavior patterns
  schedule: DailySchedule;
  goals: LifeGoals;
  
  // State tracking
  currentActivity: string;
  location: { x: number; y: number };
  lastActivityChange: number;
  
  // Economic status
  wealth: number;
  income: number;
  expenses: number;
  
  // Life events and history
  lifeEvents: Array<{
    cycle: number;
    type: string;
    description: string;
    impact: Partial<CitizenMood>;
  }>;
}

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
    const rng = this.createSeededRandom(seed);
    
    const personality: PersonalityTraits = {
      ambition: rng(),
      sociability: rng(),
      industriousness: rng(),
      contentment: rng(),
      curiosity: rng()
    };

    const needs: CitizenNeeds = {
      food: 80 + rng() * 20,
      shelter: 70 + rng() * 30,
      social: 60 + rng() * 40,
      purpose: 50 + rng() * 50,
      safety: 75 + rng() * 25
    };

    const mood: CitizenMood = {
      happiness: 60 + rng() * 30,
      stress: 20 + rng() * 30,
      energy: 70 + rng() * 30,
      motivation: 60 + rng() * 40
    };

    const schedule = this.generateDailySchedule(personality, rng);
    const goals = this.generateLifeGoals(personality, age, rng);

    const citizen: Citizen = {
      id,
      name,
      age,
      gender: rng() < 0.5 ? 'male' : 'female',
      personality,
      needs,
      mood,
      jobTitle: 'Unemployed',
      skills: this.generateSkills(personality, age, rng),
      relationships: [],
      familyMembers: [],
      schedule,
      goals,
      currentActivity: 'idle',
      location: { x: 0, y: 0 },
      lastActivityChange: 0,
      wealth: 10 + rng() * 40,
      income: 0,
      expenses: 5 + rng() * 10,
      lifeEvents: []
    };

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

    // Convert GameTime to cycle for backward compatibility
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);

    // Update needs decay
    this.updateNeeds(citizen, gameTime);
    
    // Update mood based on needs and circumstances
    this.updateMood(citizen, gameState);
    
    // Make behavioral decisions
    this.makeBehavioralDecisions(citizen, gameTime, gameState);
    
    // Update social relationships
    this.updateSocialRelationships(citizen, gameTime);
    
    // Check for life events
    this.checkForLifeEvents(citizen, gameTime, gameState);
  }

  // Update citizen needs over time
  private updateNeeds(citizen: Citizen, gameTime: GameTime): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    const decayRate = 1 - citizen.personality.contentment * 0.3;
    
    citizen.needs.food = Math.max(0, citizen.needs.food - 2 * decayRate);
    citizen.needs.shelter = Math.max(0, citizen.needs.shelter - 0.5 * decayRate);
    citizen.needs.social = Math.max(0, citizen.needs.social - 1.5 * decayRate);
    citizen.needs.purpose = Math.max(0, citizen.needs.purpose - 1 * decayRate);
    
    // Safety is affected by external factors, not internal decay
  }

  // Update citizen mood based on needs and external factors
  private updateMood(citizen: Citizen, gameState: {
    threatLevel: number;
    cityEvents: string[];
  }): void {
    const needsSatisfaction = (
      citizen.needs.food + 
      citizen.needs.shelter + 
      citizen.needs.social + 
      citizen.needs.purpose + 
      citizen.needs.safety
    ) / 5;

    // Base happiness from needs satisfaction
    const targetHappiness = needsSatisfaction * (0.7 + citizen.personality.contentment * 0.3);
    citizen.mood.happiness = this.lerp(citizen.mood.happiness, targetHappiness, 0.1);

    // Stress from unmet needs and external threats
    const needsStress = Math.max(0, 100 - needsSatisfaction);
    const threatStress = gameState.threatLevel * (1 - citizen.personality.contentment);
    const targetStress = Math.min(100, needsStress * 0.5 + threatStress * 0.3);
    citizen.mood.stress = this.lerp(citizen.mood.stress, targetStress, 0.15);

    // Energy affected by stress and work
    const workLoad = citizen.jobTitle !== 'Unemployed' ? 20 : 0;
    const targetEnergy = Math.max(20, 100 - citizen.mood.stress * 0.3 - workLoad);
    citizen.mood.energy = this.lerp(citizen.mood.energy, targetEnergy, 0.2);

    // Motivation from purpose and personality
    const targetMotivation = citizen.needs.purpose * 0.6 + citizen.personality.ambition * 40;
    citizen.mood.motivation = this.lerp(citizen.mood.motivation, targetMotivation, 0.1);
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
    let newLocation = citizen.location;
    
    if (aiGoal) {
      // Store the goal for tracking
      this.citizenGoals.set(citizen.id, aiGoal);
      
      // Convert AI goal to activity and location
      newActivity = this.convertGoalToActivity(aiGoal, citizen);
      newLocation = aiGoal.target;
      
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
        const satisfaction = this.calculateActivitySatisfaction(citizen, previousActivity, gameTime);
        citizenAI.updateCitizenState(citizen.id, true, satisfaction);
      }
      
      // Trigger activity-specific behaviors
      this.executeActivity(citizen, newActivity, gameState);
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
  private executeActivity(citizen: Citizen, activity: string, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
  }): void {
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
        this.triggerSocialInteraction(citizen);
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

  // Trigger social interaction
  private triggerSocialInteraction(citizen: Citizen): void {
    const availableTargets = Array.from(this.socialNetwork.get(citizen.id) || []);
    if (availableTargets.length === 0) return;
    
    const targetId = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    const target = this.citizens.get(targetId);
    if (!target) return;
    
    // Find or create relationship
    let relationship = citizen.relationships.find(r => r.targetId === targetId);
    if (!relationship) {
      relationship = {
        targetId,
        type: 'friend',
        strength: 20,
        lastInteraction: 0,
        interactionHistory: []
      };
      citizen.relationships.push(relationship);
    }
    
    // Positive interaction based on personality compatibility
    const compatibility = this.calculateCompatibility(citizen.personality, target.personality);
    const interactionQuality = compatibility > 0.6 ? 'positive' : 
                              compatibility < 0.4 ? 'negative' : 'neutral';
    
    // Update relationship
    relationship.lastInteraction = Date.now();
    relationship.interactionHistory.push({
      cycle: Date.now(),
      type: interactionQuality,
      context: 'casual_interaction'
    });
    
    if (interactionQuality === 'positive') {
      relationship.strength = Math.min(100, relationship.strength + 3);
    } else if (interactionQuality === 'negative') {
      relationship.strength = Math.max(0, relationship.strength - 2);
    }
  }

  // Check for life events
  private checkForLifeEvents(citizen: Citizen, gameTime: GameTime, gameState: {
    buildings: SimulatedBuilding[];
    threatLevel: number;
  }): void {
    const currentCycle = Math.floor(gameTime.totalMinutes / 60);
    const eventChance = 0.02; // 2% chance per cycle
    
    if (Math.random() < eventChance) {
      const eventType = this.selectLifeEvent(citizen, gameState);
      this.triggerLifeEvent(citizen, eventType, gameTime);
    }
  }

  // Generate daily schedule based on personality
  private generateDailySchedule(personality: PersonalityTraits, rng: () => number): DailySchedule {
    const sleepStart = 22 + rng() * 2; // 22-24
    const sleepEnd = 6 + rng() * 2; // 6-8
    const workStart = 8 + rng() * 2; // 8-10
    const workEnd = 16 + rng() * 2; // 16-18
    
    return {
      sleep: { start: sleepStart, end: sleepEnd },
      work: { start: workStart, end: workEnd },
      meals: [
        { time: 7, duration: 1 },
        { time: 12, duration: 1 },
        { time: 19, duration: 1 }
      ],
      leisure: [
        { start: workEnd + 1, end: 19, activity: 'relaxing' },
        { start: 20, end: sleepStart, activity: 'entertainment' }
      ],
      social: personality.sociability > 0.6 ? [
        { start: 18, end: 20 }
      ] : []
    };
  }

  // Generate life goals based on personality and age
  private generateLifeGoals(personality: PersonalityTraits, age: number, rng: () => number): LifeGoals {
    const careerAmbition = personality.ambition > 0.7 ? 'leadership' : 
                          personality.industriousness > 0.6 ? 'specialist' : 'stable_work';
    
    return {
      careerAspiration: careerAmbition,
      socialGoals: personality.sociability > 0.5 ? [
        { type: 'make_friends', priority: 70 },
        { type: 'find_romance', priority: age < 30 ? 80 : 40 }
      ] : [],
      materialGoals: [
        { item: 'better_housing', priority: 60 },
        { item: 'savings', priority: 50 }
      ],
      personalGrowth: [
        { skill: 'work_efficiency', currentLevel: 30, targetLevel: 70 }
      ]
    };
  }

  // Generate skills based on personality and age
  private generateSkills(personality: PersonalityTraits, age: number, rng: () => number): Record<string, number> {
    const baseSkill = Math.min(80, age * 2 + rng() * 20);
    
    return {
      work_efficiency: baseSkill * personality.industriousness,
      social_skills: baseSkill * personality.sociability,
      leadership: baseSkill * personality.ambition,
      creativity: baseSkill * personality.curiosity,
      resilience: baseSkill * personality.contentment
    };
  }

  // Calculate personality compatibility
  private calculateCompatibility(p1: PersonalityTraits, p2: PersonalityTraits): number {
    const differences = [
      Math.abs(p1.ambition - p2.ambition),
      Math.abs(p1.sociability - p2.sociability),
      Math.abs(p1.industriousness - p2.industriousness),
      Math.abs(p1.contentment - p2.contentment),
      Math.abs(p1.curiosity - p2.curiosity)
    ];
    
    const avgDifference = differences.reduce((a, b) => a + b, 0) / differences.length;
    return 1 - avgDifference; // Higher compatibility = lower differences
  }

  // Select appropriate life event
  private selectLifeEvent(citizen: Citizen, gameState: { threatLevel: number }): string {
    const events = ['promotion', 'illness', 'friendship', 'conflict', 'discovery'];
    
    // Weight events based on current state
    if (gameState.threatLevel > 50) {
      return Math.random() < 0.6 ? 'conflict' : 'illness';
    }
    
    if (citizen.mood.happiness > 70) {
      return Math.random() < 0.5 ? 'promotion' : 'friendship';
    }
    
    return events[Math.floor(Math.random() * events.length)];
  }

  // Trigger specific life event
  private triggerLifeEvent(citizen: Citizen, eventType: string, gameTimeOrCycle: GameTime | number): void {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    let impact: Partial<CitizenMood> = {};
    let description = '';
    
    switch (eventType) {
      case 'promotion':
        impact = { happiness: 15, motivation: 10, stress: 5 };
        description = `${citizen.name} received a promotion at work!`;
        citizen.income += 5;
        break;
        
      case 'illness':
        impact = { happiness: -10, energy: -20, stress: 10 };
        description = `${citizen.name} fell ill and needs rest.`;
        break;
        
      case 'friendship':
        impact = { happiness: 8 };
        description = `${citizen.name} made a new friend.`;
        citizen.needs.social = Math.min(100, citizen.needs.social + 15);
        break;
        
      case 'conflict':
        impact = { happiness: -12, stress: 15 };
        description = `${citizen.name} had a conflict with someone.`;
        citizen.needs.social = Math.max(0, citizen.needs.social - 10);
        break;
        
      case 'discovery':
        impact = { happiness: 5, motivation: 8 };
        description = `${citizen.name} discovered something interesting.`;
        break;
    }
    
    // Apply mood impact
    for (const [key, value] of Object.entries(impact)) {
      const currentValue = citizen.mood[key as keyof CitizenMood] || 0;
      citizen.mood[key as keyof CitizenMood] = Math.max(0, Math.min(100, currentValue + value));
    }
    
    // Record life event
    citizen.lifeEvents.push({
      cycle: currentCycle,
      type: eventType,
      description,
      impact
    });
  }

  // Utility functions
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  // Convert AI pathfinding goal to citizen activity
  private convertGoalToActivity(goal: PathfindingGoal, citizen: Citizen): string {
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
  private calculateActivitySatisfaction(citizen: Citizen, activity: string, gameTimeOrCycle: GameTime | number): number {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
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