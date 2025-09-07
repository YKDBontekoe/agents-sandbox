import type { ActiveEvent } from '../types';

const naturalDisaster: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'natural_disaster',
  severity: 'major',
  title: 'Natural Disaster',
  description: 'A severe storm has damaged buildings and disrupted the city.',
  impact: {
    resources: { coin: -50, planks: -20, grain: -30 },
    citizenMood: { happiness: -20, stress: 15, motivation: -10 },
    buildingEffects: { conditionChange: -2, efficiencyMultiplier: 0.7, maintenanceCostMultiplier: 1.5 },
    economicEffects: { wageMultiplier: 0.9, tradeMultiplier: 0.8, growthRate: -10 },
    duration: 10,
    probability: 0.015
  },
  iconType: 'critical',
  color: '#ff4444',
  animationType: 'shake',
  responses: [
    {
      id: 'emergency_response',
      label: 'Emergency Response',
      cost: { coin: 30, mana: 10 },
      effect: {
        citizenMood: { stress: -5, happiness: 5, motivation: 0 },
        buildingEffects: { conditionChange: 1, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 }
      },
      description: 'Deploy emergency services to minimize damage'
    },
    {
      id: 'rebuild_immediately',
      label: 'Immediate Rebuild',
      cost: { coin: 80, planks: 40 },
      effect: {
        buildingEffects: { conditionChange: 3, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Invest heavily in rapid reconstruction'
    }
  ],
  triggers: [
    {
      condition: 'low_infrastructure',
      eventType: 'social_unrest',
      probability: 0.3
    }
  ]
};

export default naturalDisaster;
