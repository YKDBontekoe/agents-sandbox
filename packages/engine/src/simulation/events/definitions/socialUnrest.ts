import type { ActiveEvent } from '../types';

const socialUnrest: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'social_unrest',
  severity: 'major',
  title: 'Social Unrest',
  description: 'Citizens are unhappy with current conditions and demand change.',
  impact: {
    resources: { coin: -40 },
    citizenMood: { happiness: -18, stress: 25, motivation: -12 },
    buildingEffects: { conditionChange: -1, efficiencyMultiplier: 0.75, maintenanceCostMultiplier: 1.3 },
    economicEffects: { wageMultiplier: 0.85, tradeMultiplier: 0.9, growthRate: -12 },
    duration: 8,
    probability: 0.015
  },
  iconType: 'warning',
  color: '#ff8844',
  animationType: 'shake',
  responses: [
    {
      id: 'address_concerns',
      label: 'Address Concerns',
      cost: { coin: 50, mana: 20 },
      effect: {
        citizenMood: { happiness: 15, stress: -10, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 },
        duration: -3
      },
      description: 'Listen to citizens and implement reforms'
    },
    {
      id: 'increase_security',
      label: 'Increase Security',
      cost: { coin: 30 },
      effect: {
        citizenMood: { stress: 5, happiness: -5, motivation: 0 },
        buildingEffects: { efficiencyMultiplier: 0.9, conditionChange: 0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 }
      },
      description: 'Maintain order through enforcement'
    }
  ]
};

export default socialUnrest;
