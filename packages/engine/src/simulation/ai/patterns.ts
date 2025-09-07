import type { AIBehaviorPattern } from './types';

// Behavior patterns library
export const BEHAVIOR_PATTERNS: AIBehaviorPattern[] = [
  {
    id: 'urgent_food_seeking',
    name: 'Urgent Food Seeking',
    priority: 100,
    conditions: [
      { type: 'need', property: 'food', operator: '<', value: 25 }
    ],
    actions: [
      { type: 'move_to', target: 'nearest_food_source', priority: 100 },
      { type: 'interact', target: 'food_source', duration: 2 }
    ],
    cooldown: 0,
    variance: 0.1
  },
  {
    id: 'social_work_collaboration',
    name: 'Social Work Collaboration',
    priority: 60,
    conditions: [
      { type: 'need', property: 'social', operator: '<', value: 40 },
      { type: 'time', property: 'hour', operator: '>=', value: 7 },
      { type: 'time', property: 'hour', operator: '<', value: 16 }
    ],
    actions: [
      { type: 'move_to', target: 'workplace_with_colleagues', priority: 60 },
      { type: 'socialize', duration: 5 },
      { type: 'work', duration: 12 }
    ],
    cooldown: 30,
    variance: 0.3
  },
  {
    id: 'exploration_drive',
    name: 'Exploration Drive',
    priority: 30,
    conditions: [
      { type: 'mood', property: 'curiosity', operator: '>', value: 70 },
      { type: 'need', property: 'purpose', operator: '>', value: 50 }
    ],
    actions: [
      { type: 'explore', target: 'unknown_area', duration: 8 },
      { type: 'move_to', target: 'random_building', priority: 30 }
    ],
    cooldown: 60,
    variance: 0.5
  },
  {
    id: 'efficient_work_routine',
    name: 'Efficient Work Routine',
    priority: 70,
    conditions: [
      { type: 'time', property: 'hour', operator: '>=', value: 7 },
      { type: 'time', property: 'hour', operator: '<', value: 16 },
      { type: 'need', property: 'purpose', operator: '<', value: 80 }
    ],
    actions: [
      { type: 'move_to', target: 'optimal_workplace', priority: 70 },
      { type: 'work', duration: 18 }
    ],
    cooldown: 15,
    variance: 0.2
  },
  {
    id: 'evening_social_gathering',
    name: 'Evening Social Gathering',
    priority: 50,
    conditions: [
      { type: 'time', property: 'hour', operator: '>=', value: 18 },
      { type: 'time', property: 'hour', operator: '<', value: 22 },
      { type: 'need', property: 'social', operator: '<', value: 60 }
    ],
    actions: [
      { type: 'move_to', target: 'social_hub', priority: 50 },
      { type: 'socialize', duration: 12 }
    ],
    cooldown: 45,
    variance: 0.4
  }
];
