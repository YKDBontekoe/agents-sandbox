import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildings/types';
import type { Citizen } from './citizenBehavior';
import type { GameTime } from '../types/gameTime';
import type { AIBehaviorPattern, PathfindingGoal } from './ai/types';
import { BEHAVIOR_PATTERNS } from './ai/patterns';

// Enhanced citizen state
export interface CitizenState {
  citizenId: string;
  currentGoal?: PathfindingGoal;
  behaviorHistory: Array<{
    pattern: string;
    timestamp: number;
    success: boolean;
    satisfaction: number;
  }>;
  preferences: {
    workStyle: 'efficient' | 'social' | 'creative' | 'methodical';
    socialTendency: number; // 0-100
    explorationDrive: number; // 0-100
    routinePreference: number; // 0-100
  };
  relationships: Map<string, {
    citizenId: string;
    relationship: 'friend' | 'colleague' | 'rival' | 'family';
    strength: number; // 0-100
    lastInteraction: number;
  }>;
  knownLocations: Map<string, {
    x: number;
    y: number;
    type: string;
    quality: number; // 0-100
    lastVisited: number;
  }>;
  adaptiveSchedule: {
    workHours: { start: number; end: number; flexibility: number };
    socialHours: { start: number; end: number; flexibility: number };
    restHours: { start: number; end: number; flexibility: number };
    personalTime: { start: number; end: number; flexibility: number };
  };
}

// Enhanced Citizen AI System
export class CitizenAI {
  private citizenStates = new Map<string, CitizenState>();
  private behaviorPatterns = new Map<string, AIBehaviorPattern>();
  private globalKnowledge = new Map<string, any>();
  
  // Movement speed multipliers for more dynamic gameplay
  private readonly speedMultipliers = {
    urgent: 2.5,     // Emergency situations
    work: 1.8,       // Going to/from work
    social: 1.5,     // Social activities
    explore: 1.3,    // Exploration
    rest: 1.0,       // Casual movement
    default: 1.6     // Base enhanced speed
  };
  
  constructor() {
    // Initialize behavior patterns
    BEHAVIOR_PATTERNS.forEach(pattern => {
      this.behaviorPatterns.set(pattern.id, pattern);
    });
  }

  // Initialize enhanced state for a citizen
  initializeCitizen(citizen: Citizen): CitizenState {
    const state: CitizenState = {
      citizenId: citizen.id,
      behaviorHistory: [],
      preferences: {
        workStyle: this.determineWorkStyle(citizen),
        socialTendency: 30 + citizen.personality.sociability * 50,
        explorationDrive: 20 + citizen.personality.curiosity * 60,
        routinePreference: 40 + citizen.personality.contentment * 40
      },
      relationships: new Map(),
      knownLocations: new Map(),
      adaptiveSchedule: this.generateAdaptiveSchedule(citizen)
    };
    
    this.citizenStates.set(citizen.id, state);
    return state;
  }

  // Determine work style based on personality
  private determineWorkStyle(citizen: Citizen): 'efficient' | 'social' | 'creative' | 'methodical' {
    const { industriousness, sociability, curiosity, contentment } = citizen.personality;
    
    if (sociability > 0.7) return 'social';
    if (curiosity > 0.7) return 'creative';
    if (industriousness > 0.7) return 'efficient';
    if (contentment > 0.7) return 'methodical';
    
    return 'efficient'; // default
  }

  // Generate adaptive schedule based on citizen preferences
  private generateAdaptiveSchedule(citizen: Citizen) {
    const baseFlexibility = citizen.personality.curiosity * 2;
    
    return {
      workHours: { 
        start: 7 + (Math.random() - 0.5) * 2, 
        end: 16 + (Math.random() - 0.5) * 2, 
        flexibility: baseFlexibility 
      },
      socialHours: { 
        start: 18 + (Math.random() - 0.5) * 2, 
        end: 21 + (Math.random() - 0.5) * 2, 
        flexibility: baseFlexibility * 1.5 
      },
      restHours: { 
        start: 22 + (Math.random() - 0.5) * 2, 
        end: 6 + (Math.random() - 0.5) * 2, 
        flexibility: baseFlexibility * 0.5 
      },
      personalTime: { 
        start: 16 + (Math.random() - 0.5) * 2, 
        end: 18 + (Math.random() - 0.5) * 2, 
        flexibility: baseFlexibility * 2 
      }
    };
  }

  // Enhanced decision making
  makeDecision(citizen: Citizen, gameTimeOrCycle: GameTime | number, gameState: {
    buildings: SimulatedBuilding[];
    resources: SimResources;
    hour: number;
  }): PathfindingGoal | null {
    const currentCycle = typeof gameTimeOrCycle === 'number' ? gameTimeOrCycle : Math.floor(gameTimeOrCycle.totalMinutes / 60);
    const state = this.citizenStates.get(citizen.id);
    if (!state) {
      return null;
    }

    // Evaluate all applicable behavior patterns
    const applicablePatterns = this.evaluateBehaviorPatterns(citizen, state, gameState);
    
    if (applicablePatterns.length === 0) {
      return this.generateExplorationGoal(citizen, state, gameState);
    }

    // Select best pattern based on priority and citizen preferences
    const selectedPattern = this.selectBestPattern(applicablePatterns, state);
    
    // Generate goal from selected pattern
    const goal = this.generateGoalFromPattern(selectedPattern, citizen, state, gameState);
    
    // Update behavior history
    state.behaviorHistory.push({
      pattern: selectedPattern.id,
      timestamp: currentCycle,
      success: false, // will be updated later
      satisfaction: 0 // will be calculated based on outcome
    });
    
    // Limit history size
    if (state.behaviorHistory.length > 50) {
      state.behaviorHistory.shift();
    }
    
    state.currentGoal = goal;
    return goal;
  }

  // Evaluate which behavior patterns apply to current situation
  private evaluateBehaviorPatterns(citizen: Citizen, state: CitizenState, gameState: any): AIBehaviorPattern[] {
    const applicable: AIBehaviorPattern[] = [];
    
    for (const pattern of this.behaviorPatterns.values()) {
      if (this.patternApplies(pattern, citizen, state, gameState)) {
        applicable.push(pattern);
      }
    }
    
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  // Check if a behavior pattern applies to current situation
  private patternApplies(pattern: AIBehaviorPattern, citizen: Citizen, state: CitizenState, gameState: any): boolean {
    return pattern.conditions.every(condition => {
      switch (condition.type) {
        case 'need':
          const needValue = citizen.needs[condition.property as keyof typeof citizen.needs] || 0;
          return this.compareValues(needValue, condition.operator, condition.value);
        
        case 'mood':
          const moodValue = citizen.mood[condition.property as keyof typeof citizen.mood] || 0;
          return this.compareValues(moodValue, condition.operator, condition.value);
        
        case 'time':
          if (condition.property === 'hour') {
            return this.compareValues(gameState.hour, condition.operator, condition.value);
          }
          return false;
        
        case 'social':
          const socialConnections = state.relationships.size;
          return this.compareValues(socialConnections, condition.operator, condition.value);
        
        default:
          return false;
      }
    });
  }

  // Compare values with operator
  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '<': return actual < expected;
      case '>': return actual > expected;
      case '==': return actual === expected;
      case '<=': return actual <= expected;
      case '>=': return actual >= expected;
      default: return false;
    }
  }

  // Select best pattern based on citizen preferences and history
  private selectBestPattern(patterns: AIBehaviorPattern[], state: CitizenState): AIBehaviorPattern {
    if (patterns.length === 1) return patterns[0];
    
    // Apply preference weighting
    const weightedPatterns = patterns.map(pattern => {
      let weight = pattern.priority;
      
      // Adjust based on recent history (avoid repetition)
      const recentUse = state.behaviorHistory
        .slice(-10)
        .filter(h => h.pattern === pattern.id).length;
      weight *= Math.max(0.3, 1 - (recentUse * 0.2));
      
      // Add variance
      weight *= (1 + (Math.random() - 0.5) * pattern.variance);
      
      return { pattern, weight };
    });
    
    // Select highest weighted pattern
    return weightedPatterns.reduce((best, current) => 
      current.weight > best.weight ? current : best
    ).pattern;
  }

  // Generate pathfinding goal from behavior pattern
  private generateGoalFromPattern(pattern: AIBehaviorPattern, citizen: Citizen, state: CitizenState, gameState: any): PathfindingGoal {
    const action = pattern.actions[0]; // Use first action for now
    
    let target = { x: citizen.location.x, y: citizen.location.y };
    let purpose: PathfindingGoal['purpose'] = 'explore';
    
    switch (action.type) {
      case 'move_to':
        target = this.resolveTarget(action.target || '', citizen, state, gameState);
        purpose = this.determinePurpose(action.target || '');
        break;
      
      case 'work':
        target = this.findOptimalWorkplace(citizen, state, gameState);
        purpose = 'work';
        break;
      
      case 'socialize':
        target = this.findSocialHub(citizen, state, gameState);
        purpose = 'social';
        break;
      
      case 'rest':
        target = this.findRestLocation(citizen, state, gameState);
        purpose = 'home';
        break;
    }
    
    return {
      target,
      purpose,
      priority: pattern.priority,
      urgency: this.calculateUrgency(pattern, citizen),
      alternatives: this.generateAlternatives(target, purpose, gameState),
      timeLimit: action.duration
    };
  }

  // Generate exploration goal when no patterns apply
  private generateExplorationGoal(citizen: Citizen, state: CitizenState, gameState: any): PathfindingGoal {
    const explorationTargets = this.findUnexploredAreas(citizen, state, gameState);
    const target = explorationTargets.length > 0 
      ? explorationTargets[Math.floor(Math.random() * explorationTargets.length)]
      : { x: citizen.location.x + (Math.random() - 0.5) * 10, y: citizen.location.y + (Math.random() - 0.5) * 10 };
    
    return {
      target,
      purpose: 'explore',
      priority: 20,
      urgency: state.preferences.explorationDrive,
      alternatives: explorationTargets.slice(0, 3),
      timeLimit: 30
    };
  }

  // Helper methods for target resolution
  private resolveTarget(targetType: string, citizen: Citizen, state: CitizenState, gameState: any): { x: number; y: number } {
    switch (targetType) {
      case 'nearest_food_source':
        return this.findNearestFoodSource(citizen, gameState);
      case 'workplace_with_colleagues':
        return this.findSocialWorkplace(citizen, state, gameState);
      case 'optimal_workplace':
        return this.findOptimalWorkplace(citizen, state, gameState);
      case 'social_hub':
        return this.findSocialHub(citizen, state, gameState);
      default:
        return citizen.location;
    }
  }

  private determinePurpose(targetType: string): PathfindingGoal['purpose'] {
    if (targetType.includes('work')) return 'work';
    if (targetType.includes('social')) return 'social';
    if (targetType.includes('food') || targetType.includes('resource')) return 'resource';
    if (targetType.includes('home')) return 'home';
    return 'explore';
  }

  private calculateUrgency(pattern: AIBehaviorPattern, citizen: Citizen): number {
    // Base urgency on pattern priority and citizen needs
    let urgency = pattern.priority;
    
    // Adjust based on critical needs
    if (citizen.needs.food < 30) urgency += 30;
    if (citizen.needs.shelter < 30) urgency += 20;
    if (citizen.mood.stress > 70) urgency += 15;
    
    return Math.min(100, urgency);
  }

  private generateAlternatives(target: { x: number; y: number }, purpose: PathfindingGoal['purpose'], gameState: any): Array<{ x: number; y: number; score: number }> {
    const alternatives: Array<{ x: number; y: number; score: number }> = [];
    
    // Generate nearby alternatives with scoring
    for (let i = 0; i < 3; i++) {
      const alt = {
        x: target.x + (Math.random() - 0.5) * 6,
        y: target.y + (Math.random() - 0.5) * 6,
        score: Math.random() * 100
      };
      alternatives.push(alt);
    }
    
    return alternatives.sort((a, b) => b.score - a.score);
  }

  // Location finding methods
  private findNearestFoodSource(citizen: Citizen, gameState: any): { x: number; y: number } {
    const foodBuildings = gameState.buildings.filter((b: SimulatedBuilding) => 
      b.typeId === 'farm' || b.typeId === 'market'
    );
    
    if (foodBuildings.length === 0) {
      return citizen.location;
    }
    
    return foodBuildings.reduce((nearest: SimulatedBuilding, building: SimulatedBuilding) => {
      const distToCurrent = Math.hypot(building.x - citizen.location.x, building.y - citizen.location.y);
      const distToNearest = Math.hypot(nearest.x - citizen.location.x, nearest.y - citizen.location.y);
      return distToCurrent < distToNearest ? building : nearest;
    });
  }

  private findOptimalWorkplace(citizen: Citizen, state: CitizenState, gameState: any): { x: number; y: number } {
    const workBuildings = gameState.buildings.filter((b: SimulatedBuilding) => 
      b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill'
    );
    
    if (workBuildings.length === 0) {
      return citizen.location;
    }
    
    // Score workplaces based on efficiency, distance, and social factors
    const scoredWorkplaces = workBuildings.map((building: SimulatedBuilding) => {
      const distance = Math.hypot(building.x - citizen.location.x, building.y - citizen.location.y);
      let score = building.utilityEfficiency || 50;
      
      // Prefer closer workplaces
      score -= distance * 2;
      
      // Social workers prefer workplaces with colleagues
      if (state.preferences.workStyle === 'social') {
        const colleagues = Array.from(state.relationships.values())
          .filter(r => r.relationship === 'colleague').length;
        score += colleagues * 10;
      }
      
      return { building, score };
    });
    
    return scoredWorkplaces.reduce((best: { building: SimulatedBuilding; score: number }, current: { building: SimulatedBuilding; score: number }) => 
      current.score > best.score ? current : best
    ).building;
  }

  private findSocialWorkplace(citizen: Citizen, state: CitizenState, gameState: any): { x: number; y: number } {
    // Find workplace with known colleagues
    const workplaces = gameState.buildings.filter((b: SimulatedBuilding) => 
      b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill'
    );
    
    // For now, return a random workplace - in full implementation, track colleague locations
    return workplaces.length > 0 
      ? workplaces[Math.floor(Math.random() * workplaces.length)]
      : citizen.location;
  }

  private findSocialHub(citizen: Citizen, state: CitizenState, gameState: any): { x: number; y: number } {
    const socialBuildings = gameState.buildings.filter((b: SimulatedBuilding) => 
      b.typeId === 'market' || b.typeId === 'house'
    );
    
    return socialBuildings.length > 0 
      ? socialBuildings[Math.floor(Math.random() * socialBuildings.length)]
      : citizen.location;
  }

  private findRestLocation(citizen: Citizen, state: CitizenState, gameState: any): { x: number; y: number } {
    const houses = gameState.buildings.filter((b: SimulatedBuilding) => b.typeId === 'house');
    
    return houses.length > 0 
      ? houses[Math.floor(Math.random() * houses.length)]
      : citizen.location;
  }

  private findUnexploredAreas(citizen: Citizen, state: CitizenState, gameState: any): Array<{ x: number; y: number; score: number }> {
    const explored = Array.from(state.knownLocations.values());
    const unexplored: Array<{ x: number; y: number; score: number }> = [];
    
    // Generate potential exploration targets
    for (let i = 0; i < 5; i++) {
      const target = {
        x: citizen.location.x + (Math.random() - 0.5) * 20,
        y: citizen.location.y + (Math.random() - 0.5) * 20,
        score: Math.random() * 100
      };
      
      // Check if area is already known
      const isKnown = explored.some(loc => 
        Math.hypot(loc.x - target.x, loc.y - target.y) < 5
      );
      
      if (!isKnown) {
        unexplored.push(target);
      }
    }
    
    return unexplored.sort((a, b) => b.score - a.score);
  }

  // Update citizen state after goal completion
  updateCitizenState(citizenId: string, goalCompleted: boolean, satisfaction: number): void {
    const state = this.citizenStates.get(citizenId);
    if (!state || state.behaviorHistory.length === 0) return;
    
    // Update last behavior entry
    const lastBehavior = state.behaviorHistory[state.behaviorHistory.length - 1];
    lastBehavior.success = goalCompleted;
    lastBehavior.satisfaction = satisfaction;
    
    // Learn from experience - adjust preferences based on outcomes
    if (goalCompleted && satisfaction > 70) {
      // Positive reinforcement
      this.reinforceBehavior(state, lastBehavior.pattern, 0.1);
    } else if (!goalCompleted || satisfaction < 30) {
      // Negative reinforcement
      this.reinforceBehavior(state, lastBehavior.pattern, -0.05);
    }
  }

  private reinforceBehavior(state: CitizenState, patternId: string, adjustment: number): void {
    // Adjust preferences based on behavior outcomes
    const pattern = this.behaviorPatterns.get(patternId);
    if (!pattern) return;
    
    if (pattern.id.includes('social')) {
      state.preferences.socialTendency = Math.max(0, Math.min(100, 
        state.preferences.socialTendency + adjustment * 10
      ));
    }
    
    if (pattern.id.includes('exploration')) {
      state.preferences.explorationDrive = Math.max(0, Math.min(100, 
        state.preferences.explorationDrive + adjustment * 10
      ));
    }
  }

  // Get citizen state for external access
  getCitizenState(citizenId: string): CitizenState | undefined {
    return this.citizenStates.get(citizenId);
  }

  // Clean up inactive citizens
  cleanup(activeCitizenIds: string[]): void {
    const activeSet = new Set(activeCitizenIds);
    for (const citizenId of this.citizenStates.keys()) {
      if (!activeSet.has(citizenId)) {
        this.citizenStates.delete(citizenId);
      }
    }
  }

  // Get movement speed multiplier based on goal purpose
  getMovementSpeed(goal: PathfindingGoal): number {
    switch (goal.purpose) {
      case 'emergency':
        return this.speedMultipliers.urgent;
      case 'work':
        return this.speedMultipliers.work;
      case 'social':
        return this.speedMultipliers.social;
      case 'explore':
        return this.speedMultipliers.explore;
      case 'home':
        return this.speedMultipliers.rest;
      case 'resource':
        return goal.urgency > 70 ? this.speedMultipliers.urgent : this.speedMultipliers.default;
      default:
        return this.speedMultipliers.default;
    }
  }

  // Get enhanced movement speed based on citizen personality and time of day
  getEnhancedMovementSpeed(citizen: Citizen, goal: PathfindingGoal, gameTime: GameTime): number {
    let baseSpeed = this.getMovementSpeed(goal);
    
    // Personality affects movement speed
    const personalityBonus = citizen.personality.industriousness * 0.3;
    baseSpeed *= (1 + personalityBonus);
    
    // Time of day affects energy and speed
    const hour = gameTime.hour;
    if (hour >= 6 && hour <= 10) {
      baseSpeed *= 1.2; // Morning energy boost
    } else if (hour >= 14 && hour <= 18) {
      baseSpeed *= 1.1; // Afternoon productivity
    } else if (hour >= 22 || hour <= 5) {
      baseSpeed *= 0.8; // Night slowdown
    }
    
    return Math.min(baseSpeed, 3.0); // Cap at 3x speed
  }
}

// Export singleton instance
export const citizenAI = new CitizenAI();