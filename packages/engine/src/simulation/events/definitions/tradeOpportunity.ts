import type { EventDefinition } from '../types';

const tradeOpportunity: EventDefinition = {
  type: 'trade_opportunity',
  severity: 'moderate',
  title: 'Trade Opportunity',
  description: 'Foreign merchants offer lucrative trade deals for your goods.',
  impact: {
    resources: { coin: 60 },
    citizenMood: { happiness: 8, stress: 0, motivation: 5 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
    economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 1.25, growthRate: 10 },
    duration: 8,
    probability: 0.01
  },
  iconType: 'positive',
  color: '#4444ff',
  animationType: 'glow',
  responses: [
    {
      id: 'accept_deal',
      label: 'Accept Trade Deal',
      cost: { planks: 20, grain: 30 },
      effect: {
        resources: { coin: 80 },
        citizenMood: { happiness: 0, stress: 0, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { tradeMultiplier: 1.1, wageMultiplier: 1.0, growthRate: 0 }
      },
      description: 'Trade resources for immediate profit'
    }
  ]
};

export default tradeOpportunity;
