import type { EventDefinition } from '../types';

const festival: EventDefinition = {
  type: 'festival',
  severity: 'minor',
  title: 'City Festival',
  description: 'Citizens organize a celebration that boosts morale and community spirit.',
  impact: {
    resources: { coin: -15, grain: -20 },
    citizenMood: { happiness: 20, stress: -10, motivation: 8 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 1.0 },
    economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.05, growthRate: 3 },
    duration: 3,
    probability: 0.015
  },
  iconType: 'positive',
  color: '#ffff44',
  animationType: 'bounce',
  eraPrerequisites: { maxStage: 2 },
  responses: [
    {
      id: 'sponsor_festival',
      label: 'Sponsor Festival',
      cost: { coin: 25, grain: 15 },
      effect: {
        citizenMood: { happiness: 10, stress: 0, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Invest in making the festival even better'
    }
  ],
  resolution: {
    description: 'Stewards enshrine the festival calendar, giving citizens a pressure valve that reduces unrest.',
    pressureAdjustments: { unrest: -0.3 }
  }
};

export default festival;
