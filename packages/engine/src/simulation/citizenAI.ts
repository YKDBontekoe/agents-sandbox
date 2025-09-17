import type { SimResources } from '../index';
import type { SimulatedBuilding } from './buildingSimulation';
import type { Citizen } from './citizens/citizen';
import type { GameTime } from '../types/gameTime';
import type { AIBehaviorPattern, PathfindingGoal } from './ai/types';
import { BEHAVIOR_PATTERNS } from './ai/patterns';
import {
  adjustPreferenceMetric,
  createCitizenProfile,
  type CitizenProfile
} from './ai/citizenProfile';
import {
  evaluateBehaviorPatterns,
  selectBestPattern,
  type PatternEvaluationState
} from './ai/patternEngine';
import { BehaviorHistoryStore } from './ai/stores/behaviorHistoryStore';
import {
  RelationshipStore,
  type CitizenRelationshipRecord
} from './ai/stores/relationshipStore';

interface KnownLocationRecord {
  x: number;
  y: number;
  type: string;
  quality: number;
  lastVisited: number;
}

export class CitizenAI {
  private readonly profiles = new Map<string, CitizenProfile>();
  private readonly knownLocations = new Map<string, Map<string, KnownLocationRecord>>();
  private readonly currentGoals = new Map<string, PathfindingGoal | undefined>();
  private readonly historyStore = new BehaviorHistoryStore();
  private readonly relationshipStore = new RelationshipStore();
  private readonly behaviorPatterns = new Map<string, AIBehaviorPattern>();
  private readonly globalKnowledge = new Map<string, unknown>();
  private readonly rng: () => number;

  private readonly speedMultipliers = {
    urgent: 2.5,
    work: 1.8,
    social: 1.5,
    explore: 1.3,
    rest: 1.0,
    default: 1.6
  } as const;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;

    BEHAVIOR_PATTERNS.forEach(pattern => {
      this.behaviorPatterns.set(pattern.id, pattern);
    });
  }

  initializeCitizen(citizen: Citizen): CitizenProfile {
    const profile = createCitizenProfile(citizen, this.rng);
    this.profiles.set(citizen.id, profile);
    this.knownLocations.set(citizen.id, new Map());
    this.currentGoals.delete(citizen.id);
    this.historyStore.reset(citizen.id);
    this.relationshipStore.ensure(citizen.id);
    return profile;
  }

  getProfile(citizenId: string): CitizenProfile | undefined {
    return this.profiles.get(citizenId);
  }

  makeDecision(
    citizen: Citizen,
    gameTimeOrCycle: GameTime | number,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): PathfindingGoal | null {
    const currentCycle =
      typeof gameTimeOrCycle === 'number'
        ? gameTimeOrCycle
        : Math.floor(gameTimeOrCycle.totalMinutes / 60);

    const profile = this.profiles.get(citizen.id) ?? this.initializeCitizen(citizen);
    const relationships = this.relationshipStore.getAll(citizen.id);

    const evaluationState: PatternEvaluationState = {
      buildings: gameState.buildings,
      resources: gameState.resources,
      hour: gameState.hour
    };

    const applicablePatterns = evaluateBehaviorPatterns({
      patterns: this.behaviorPatterns.values(),
      citizen,
      relationshipsCount: relationships.length,
      state: evaluationState
    });

    if (applicablePatterns.length === 0) {
      const explorationGoal = this.generateExplorationGoal(citizen, profile, gameState);
      this.currentGoals.set(citizen.id, explorationGoal);
      return explorationGoal;
    }

    const selectedPattern = selectBestPattern(applicablePatterns, {
      recentHistory: this.historyStore.getRecent(citizen.id, 10),
      rng: this.rng
    });

    if (!selectedPattern) {
      const explorationGoal = this.generateExplorationGoal(citizen, profile, gameState);
      this.currentGoals.set(citizen.id, explorationGoal);
      return explorationGoal;
    }

    const goal = this.generateGoalFromPattern(
      selectedPattern,
      citizen,
      profile,
      relationships,
      gameState
    );

    this.historyStore.record(citizen.id, selectedPattern.id, currentCycle);
    this.currentGoals.set(citizen.id, goal);
    return goal;
  }

  updateCitizenState(citizenId: string, goalCompleted: boolean, satisfaction: number): void {
    this.historyStore.updateLast(citizenId, { success: goalCompleted, satisfaction });
    const lastBehavior = this.historyStore.getLast(citizenId);

    if (!lastBehavior) {
      return;
    }

    if (goalCompleted && satisfaction > 70) {
      this.reinforceBehavior(citizenId, lastBehavior.pattern, 0.1);
    } else if (!goalCompleted || satisfaction < 30) {
      this.reinforceBehavior(citizenId, lastBehavior.pattern, -0.05);
    }
  }

  cleanup(activeCitizenIds: string[]): void {
    const activeSet = new Set(activeCitizenIds);

    for (const citizenId of this.profiles.keys()) {
      if (!activeSet.has(citizenId)) {
        this.profiles.delete(citizenId);
      }
    }

    for (const citizenId of this.knownLocations.keys()) {
      if (!activeSet.has(citizenId)) {
        this.knownLocations.delete(citizenId);
      }
    }

    for (const citizenId of this.currentGoals.keys()) {
      if (!activeSet.has(citizenId)) {
        this.currentGoals.delete(citizenId);
      }
    }

    for (const citizenId of this.globalKnowledge.keys()) {
      if (!activeSet.has(citizenId)) {
        this.globalKnowledge.delete(citizenId);
      }
    }

    this.historyStore.cleanup(activeCitizenIds);
    this.relationshipStore.cleanup(activeCitizenIds);
  }

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

  getEnhancedMovementSpeed(citizen: Citizen, goal: PathfindingGoal, gameTime: GameTime): number {
    let baseSpeed = this.getMovementSpeed(goal);

    const personalityBonus = citizen.personality.industriousness * 0.3;
    baseSpeed *= 1 + personalityBonus;

    const hour = gameTime.hour;
    if (hour >= 6 && hour <= 10) {
      baseSpeed *= 1.2;
    } else if (hour >= 14 && hour <= 18) {
      baseSpeed *= 1.1;
    } else if (hour >= 22 || hour <= 5) {
      baseSpeed *= 0.8;
    }

    return Math.min(baseSpeed, 3.0);
  }

  private getKnownLocations(citizenId: string): Map<string, KnownLocationRecord> {
    let locations = this.knownLocations.get(citizenId);
    if (!locations) {
      locations = new Map();
      this.knownLocations.set(citizenId, locations);
    }
    return locations;
  }

  private generateGoalFromPattern(
    pattern: AIBehaviorPattern,
    citizen: Citizen,
    profile: CitizenProfile,
    relationships: CitizenRelationshipRecord[],
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): PathfindingGoal {
    const action = pattern.actions[0];

    let target = { x: citizen.location.x, y: citizen.location.y };
    let purpose: PathfindingGoal['purpose'] = 'explore';

    switch (action.type) {
      case 'move_to':
        target = this.resolveTarget(action.target ?? '', citizen, profile, relationships, gameState);
        purpose = this.determinePurpose(action.target ?? '');
        break;
      case 'work':
        target = this.findOptimalWorkplace(citizen, profile, relationships, gameState);
        purpose = 'work';
        break;
      case 'socialize':
        target = this.findSocialHub(citizen, profile, gameState);
        purpose = 'social';
        break;
      case 'rest':
        target = this.findRestLocation(citizen, gameState);
        purpose = 'home';
        break;
      case 'explore':
        return this.generateExplorationGoal(citizen, profile, gameState);
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

  private generateExplorationGoal(
    citizen: Citizen,
    profile: CitizenProfile,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): PathfindingGoal {
    const explorationTargets = this.findUnexploredAreas(citizen, profile, gameState);
    const target =
      explorationTargets.length > 0
        ? explorationTargets[Math.floor(this.rng() * explorationTargets.length)]
        : {
            x: citizen.location.x + (this.rng() - 0.5) * 10,
            y: citizen.location.y + (this.rng() - 0.5) * 10
          };

    return {
      target,
      purpose: 'explore',
      priority: 20,
      urgency: profile.preferences.explorationDrive,
      alternatives: explorationTargets.slice(0, 3),
      timeLimit: 30
    };
  }

  private resolveTarget(
    targetType: string,
    citizen: Citizen,
    profile: CitizenProfile,
    relationships: CitizenRelationshipRecord[],
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    switch (targetType) {
      case 'nearest_food_source':
        return this.findNearestFoodSource(citizen, gameState);
      case 'workplace_with_colleagues':
        return this.findSocialWorkplace(citizen, relationships, gameState);
      case 'optimal_workplace':
        return this.findOptimalWorkplace(citizen, profile, relationships, gameState);
      case 'social_hub':
        return this.findSocialHub(citizen, profile, gameState);
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
    let urgency = pattern.priority;

    if (citizen.needs.food < 30) urgency += 30;
    if (citizen.needs.shelter < 30) urgency += 20;
    if (citizen.mood.stress > 70) urgency += 15;

    return Math.min(100, urgency);
  }

  private generateAlternatives(
    target: { x: number; y: number },
    purpose: PathfindingGoal['purpose'],
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): Array<{ x: number; y: number; score: number }> {
    const alternatives: Array<{ x: number; y: number; score: number }> = [];

    for (let i = 0; i < 3; i++) {
      alternatives.push({
        x: target.x + (this.rng() - 0.5) * 6,
        y: target.y + (this.rng() - 0.5) * 6,
        score: this.rng() * 100
      });
    }

    return alternatives.sort((a, b) => b.score - a.score);
  }

  private findNearestFoodSource(
    citizen: Citizen,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    const foodBuildings = gameState.buildings.filter(
      (b: SimulatedBuilding) => b.typeId === 'farm' || b.typeId === 'market'
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

  private findOptimalWorkplace(
    citizen: Citizen,
    profile: CitizenProfile,
    relationships: CitizenRelationshipRecord[],
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    const workBuildings = gameState.buildings.filter(
      (b: SimulatedBuilding) => b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill'
    );

    if (workBuildings.length === 0) {
      return citizen.location;
    }

    const colleagueCount = relationships.filter(rel => rel.relationship === 'colleague').length;

    const scoredWorkplaces = workBuildings.map((building: SimulatedBuilding) => {
      const distance = Math.hypot(building.x - citizen.location.x, building.y - citizen.location.y);
      let score = building.utilityEfficiency || 50;

      score -= distance * 2;

      if (profile.preferences.workStyle === 'social') {
        score += colleagueCount * 10;
      }

      return { building, score };
    });

    return scoredWorkplaces.reduce(
      (best, current) => (current.score > best.score ? current : best)
    ).building;
  }

  private findSocialWorkplace(
    citizen: Citizen,
    relationships: CitizenRelationshipRecord[],
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    const workplaces = gameState.buildings.filter(
      (b: SimulatedBuilding) => b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill'
    );

    if (workplaces.length === 0) {
      return citizen.location;
    }

    const colleagueIds = new Set(
      relationships.filter(rel => rel.relationship === 'colleague').map(rel => rel.citizenId)
    );

    const preferred = workplaces.find(building => colleagueIds.has(building.id ?? ''));
    if (preferred) {
      return preferred;
    }

    return workplaces[Math.floor(this.rng() * workplaces.length)];
  }

  private findSocialHub(
    citizen: Citizen,
    profile: CitizenProfile,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    const socialBuildings = gameState.buildings.filter(
      (b: SimulatedBuilding) => b.typeId === 'market' || b.typeId === 'house'
    );

    if (socialBuildings.length === 0) {
      return citizen.location;
    }

    if (profile.preferences.socialTendency > 60) {
      return socialBuildings.reduce((best, current) =>
        (current.utilityEfficiency ?? 0) > (best.utilityEfficiency ?? 0) ? current : best
      );
    }

    return socialBuildings[Math.floor(this.rng() * socialBuildings.length)];
  }

  private findRestLocation(
    citizen: Citizen,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): { x: number; y: number } {
    const houses = gameState.buildings.filter((b: SimulatedBuilding) => b.typeId === 'house');

    if (houses.length === 0) {
      return citizen.location;
    }

    return houses[Math.floor(this.rng() * houses.length)];
  }

  private findUnexploredAreas(
    citizen: Citizen,
    profile: CitizenProfile,
    gameState: {
      buildings: SimulatedBuilding[];
      resources: SimResources;
      hour: number;
    }
  ): Array<{ x: number; y: number; score: number }> {
    const explored = Array.from(this.getKnownLocations(citizen.id).values());
    const unexplored: Array<{ x: number; y: number; score: number }> = [];

    for (let i = 0; i < 5; i++) {
      const target = {
        x: citizen.location.x + (this.rng() - 0.5) * 20,
        y: citizen.location.y + (this.rng() - 0.5) * 20,
        score: this.rng() * 100
      };

      const isKnown = explored.some(loc => Math.hypot(loc.x - target.x, loc.y - target.y) < 5);

      if (!isKnown) {
        unexplored.push(target);
      }
    }

    return unexplored.sort((a, b) => b.score - a.score);
  }

  private reinforceBehavior(citizenId: string, patternId: string, adjustment: number): void {
    const profile = this.profiles.get(citizenId);
    if (!profile) {
      return;
    }

    let updatedProfile = profile;

    if (patternId.includes('social')) {
      updatedProfile = adjustPreferenceMetric(updatedProfile, 'socialTendency', adjustment * 10);
    }

    if (patternId.includes('exploration')) {
      updatedProfile = adjustPreferenceMetric(updatedProfile, 'explorationDrive', adjustment * 10);
    }

    if (updatedProfile !== profile) {
      this.profiles.set(citizenId, updatedProfile);
    }
  }
}

export const citizenAI = new CitizenAI();
