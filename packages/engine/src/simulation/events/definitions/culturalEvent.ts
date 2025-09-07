import type { EventDefinition } from '../types';

const culturalEvent: EventDefinition = {
  type: 'cultural_event',
  severity: 'minor',
  title: 'Cultural Event',
  description: 'Artists and performers create vibrant cultural activities.',
  impact: {
    resources: { coin: -5, mana: 10 },
    citizenMood: { happiness: 18, stress: -8, motivation: 10 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 1.0 },
    economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.08, growthRate: 4 },
    duration: 4,
    probability: 0.035
  },
  iconType: 'positive',
  color: '#aa44ff',
  animationType: 'pulse',
  responses: [
    {
      id: 'support_arts',
      label: 'Support Arts',
      cost: { coin: 15, mana: 5 },
      effect: {
        citizenMood: { happiness: 8, stress: 0, motivation: 5 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        duration: 6
      },
      description: 'Fund cultural programs for extended benefits'
    }
  ]
};

export default culturalEvent;
