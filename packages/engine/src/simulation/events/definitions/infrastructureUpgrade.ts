import type { EventDefinition } from '../types';

const infrastructureUpgrade: EventDefinition = {
  type: 'infrastructure_upgrade',
  severity: 'moderate',
  title: 'Infrastructure Upgrade',
  description: 'City systems receive improvements that boost overall efficiency.',
  impact: {
    resources: { coin: -40, mana: -15 },
    citizenMood: { happiness: 10, stress: -5, motivation: 8 },
    buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.2, maintenanceCostMultiplier: 0.9 },
    economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.1, growthRate: 12 },
    duration: 20,
    probability: 0.015
  },
  iconType: 'positive',
  color: '#4488ff',
  animationType: 'glow',
  responses: [
    {
      id: 'comprehensive_upgrade',
      label: 'Comprehensive Upgrade',
      cost: { coin: 80, mana: 30 },
      effect: {
        buildingEffects: { conditionChange: 2, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 0.95 },
        economicEffects: { growthRate: 8, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
        duration: 15
      },
      description: 'Invest heavily in city-wide improvements'
    }
  ]
};

export default infrastructureUpgrade;
