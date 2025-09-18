import type { EventDefinition } from '../types';

const economicBoom: EventDefinition = {
  type: 'economic_boom',
  severity: 'moderate',
  title: 'Economic Boom',
  description: 'Trade routes flourish and prosperity spreads throughout the city.',
  impact: {
    resources: { coin: 100, mana: 20 },
    citizenMood: { happiness: 15, stress: -5, motivation: 10 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.2, maintenanceCostMultiplier: 0.9 },
    economicEffects: { wageMultiplier: 1.15, tradeMultiplier: 1.3, growthRate: 15 },
    duration: 15,
    probability: 0.008
  },
  iconType: 'positive',
  color: '#44ff44',
  animationType: 'glow',
  eraPrerequisites: { allowedEraIds: ['expansion_age', 'ascension_age'] },
  responses: [
    {
      id: 'invest_growth',
      label: 'Invest in Growth',
      cost: { coin: 50 },
      effect: {
        economicEffects: { growthRate: 10, wageMultiplier: 1.0, tradeMultiplier: 1.0 },
        duration: 10
      },
      description: 'Reinvest profits to sustain the boom'
    }
  ],
  resolution: {
    description: 'Guild factors codify equitable tariffs, easing unrest as commerce stabilizes.',
    pressureAdjustments: { unrest: -0.5 }
  },
  triggers: [
    {
      condition: 'high_trade',
      eventType: 'trade_opportunity',
      probability: 0.4
    }
  ]
};

export default economicBoom;
