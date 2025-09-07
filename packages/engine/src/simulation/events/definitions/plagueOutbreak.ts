import type { ActiveEvent } from '../types';

const plagueOutbreak: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'plague_outbreak',
  severity: 'critical',
  title: 'Plague Outbreak',
  description: 'A contagious disease spreads through the population, affecting productivity.',
  impact: {
    resources: { coin: -30, grain: -40 },
    citizenMood: { happiness: -25, stress: 20, motivation: -15 },
    buildingEffects: { conditionChange: -1, efficiencyMultiplier: 0.6, maintenanceCostMultiplier: 1.2 },
    economicEffects: { wageMultiplier: 0.8, tradeMultiplier: 0.7, growthRate: -15 },
    duration: 12,
    probability: 0.02
  },
  iconType: 'critical',
  color: '#aa44aa',
  animationType: 'pulse',
  responses: [
    {
      id: 'quarantine',
      label: 'Implement Quarantine',
      cost: { coin: 25, mana: 15 },
      effect: {
        citizenMood: { stress: 5, happiness: -5, motivation: 0 },
        buildingEffects: { efficiencyMultiplier: 0.8, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
        duration: -3
      },
      description: 'Strict isolation to contain the spread'
    },
    {
      id: 'medical_research',
      label: 'Medical Research',
      cost: { coin: 60, mana: 30 },
      effect: {
        citizenMood: { happiness: 10, stress: -10, motivation: 0 },
        buildingEffects: { efficiencyMultiplier: 0.9, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
        duration: -5
      },
      description: 'Invest in finding a cure'
    }
  ],
  triggers: [
    {
      condition: 'high_population_density',
      eventType: 'social_unrest',
      probability: 0.25
    }
  ]
};

export default plagueOutbreak;
