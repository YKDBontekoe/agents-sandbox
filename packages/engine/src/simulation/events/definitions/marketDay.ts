import type { EventDefinition } from '../types';

const marketDay: EventDefinition = {
  type: 'market_day',
  severity: 'minor',
  title: 'Market Day',
  description: 'Weekly market brings increased trade and citizen activity.',
  impact: {
    resources: { coin: 25, grain: -10 },
    citizenMood: { happiness: 12, stress: -3, motivation: 6 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.08, maintenanceCostMultiplier: 1.0 },
    economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.2, growthRate: 5 },
    duration: 2,
    probability: 0.05
  },
  iconType: 'positive',
  color: '#00aa44',
  animationType: 'glow',
  responses: [
    {
      id: 'expand_market',
      label: 'Expand Market',
      cost: { coin: 20, planks: 15 },
      effect: {
        citizenMood: { happiness: 5, stress: 0, motivation: 0 },
        economicEffects: { tradeMultiplier: 1.1, wageMultiplier: 1.0, growthRate: 3 },
        duration: 3
      },
      description: 'Invest in market infrastructure for lasting benefits'
    }
  ]
};

export default marketDay;
