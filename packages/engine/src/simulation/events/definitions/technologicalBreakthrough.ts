import type { ActiveEvent } from '../types';

const technologicalBreakthrough: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'technological_breakthrough',
  severity: 'major',
  title: 'Technological Breakthrough',
  description: 'Researchers have made a significant discovery that improves efficiency.',
  impact: {
    resources: { mana: 40 },
    citizenMood: { happiness: 12, stress: 0, motivation: 15 },
    buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.25, maintenanceCostMultiplier: 0.8 },
    economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.15, growthRate: 20 },
    duration: 25,
    probability: 0.012
  },
  iconType: 'positive',
  color: '#44ffff',
  animationType: 'glow',
  responses: [
    {
      id: 'implement_widely',
      label: 'Implement City-wide',
      cost: { coin: 100, mana: 50 },
      effect: {
        citizenMood: { happiness: 0, stress: 0, motivation: 0 },
        buildingEffects: { efficiencyMultiplier: 1.15, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 15, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Deploy the technology across all buildings'
    }
  ]
};

export default technologicalBreakthrough;
