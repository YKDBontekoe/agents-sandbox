export interface PersonalityTraits {
  ambition: number; // 0-1, affects career progression desire
  sociability: number; // 0-1, affects social interaction frequency
  industriousness: number; // 0-1, affects work efficiency and overtime willingness
  contentment: number; // 0-1, affects happiness baseline and needs sensitivity
  curiosity: number; // 0-1, affects exploration and learning behaviors
}

export interface CitizenNeeds {
  food: number; // 0-100, decreases over time, fulfilled by grain access
  shelter: number; // 0-100, decreases slowly, fulfilled by housing quality
  social: number; // 0-100, decreases over time, fulfilled by interactions
  purpose: number; // 0-100, decreases over time, fulfilled by meaningful work
  safety: number; // 0-100, affected by city threat level and crime
}

export interface CitizenMood {
  happiness: number; // 0-100, overall life satisfaction
  stress: number; // 0-100, work and life pressure
  energy: number; // 0-100, physical and mental energy
  motivation: number; // 0-100, drive to work and contribute
}

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
