// AI behavior and pathfinding types
export interface AIBehaviorPattern {
  id: string;
  name: string;
  priority: number;
  conditions: Array<{
    type: 'need' | 'mood' | 'time' | 'location' | 'resource' | 'social';
    property: string;
    operator: '<' | '>' | '==' | '<=' | '>=';
    value: number;
  }>;
  actions: Array<{
    type: 'move_to' | 'interact' | 'work' | 'rest' | 'socialize' | 'explore';
    target?: string;
    duration?: number;
    priority?: number;
  }>;
  cooldown: number;
  variance: number; // randomization factor 0-1
}

export interface PathfindingGoal {
  target: { x: number; y: number };
  purpose: 'work' | 'home' | 'social' | 'resource' | 'explore' | 'emergency';
  priority: number;
  urgency: number; // 0-100
  alternatives: Array<{ x: number; y: number; score: number }>;
  timeLimit?: number;
  requirements?: string[];
}
