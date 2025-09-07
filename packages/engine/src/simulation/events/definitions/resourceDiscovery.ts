import type { ActiveEvent } from '../types';

const resourceDiscovery: Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'> = {
  type: 'resource_discovery',
  severity: 'moderate',
  title: 'Resource Discovery',
  description: 'Explorers have found a rich deposit of valuable resources nearby.',
  impact: {
    resources: { coin: 30, planks: 50, grain: 40, mana: 15 },
    citizenMood: { happiness: 10, stress: 0, motivation: 8 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.0 },
    economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.1, growthRate: 8 },
    duration: 20,
    probability: 0.018
  },
  iconType: 'positive',
  color: '#ffaa44',
  animationType: 'bounce',
  responses: [
    {
      id: 'exploit_immediately',
      label: 'Immediate Exploitation',
      cost: { coin: 20, mana: 5 },
      effect: {
        resources: { coin: 50, planks: 30 },
        duration: -5,
        citizenMood: { happiness: 0, stress: 0, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 1.0, growthRate: 0 }
      },
      description: 'Extract resources quickly but unsustainably'
    },
    {
      id: 'sustainable_extraction',
      label: 'Sustainable Extraction',
      cost: { coin: 40, mana: 10 },
      effect: {
        resources: { coin: 20, planks: 20 },
        duration: 15,
        citizenMood: { happiness: 0, stress: 0, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Develop the resource site for long-term benefit'
    }
  ]
};

export default resourceDiscovery;
