import type { ActiveEvent } from '../types';

const constructionBoom: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'construction_boom',
  severity: 'moderate',
  title: 'Construction Boom',
  description: 'A surge in construction activity accelerates city development.',
  impact: {
    resources: { coin: -30, planks: -40 },
    citizenMood: { happiness: 8, stress: 5, motivation: 12 },
    buildingEffects: { conditionChange: 2, efficiencyMultiplier: 1.15, maintenanceCostMultiplier: 0.85 },
    economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.05, growthRate: 25 },
    duration: 8,
    probability: 0.025
  },
  iconType: 'positive',
  color: '#ff8800',
  animationType: 'bounce',
  responses: [
    {
      id: 'accelerate_construction',
      label: 'Accelerate Construction',
      cost: { coin: 50, planks: 30 },
      effect: {
        buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 15, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
        duration: 5
      },
      description: 'Invest more resources to speed up construction'
    }
  ]
};

export default constructionBoom;
