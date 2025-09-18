import type { EventDefinition } from '../types';

const migrationWave: EventDefinition = {
  type: 'migration_wave',
  severity: 'moderate',
  title: 'Migration Wave',
  description: 'New settlers arrive seeking opportunities, increasing population and demand.',
  impact: {
    resources: { coin: 20, grain: -25 },
    citizenMood: { happiness: 5, stress: 8, motivation: 5 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.1, maintenanceCostMultiplier: 1.1 },
    economicEffects: { wageMultiplier: 0.95, tradeMultiplier: 1.1, growthRate: 8 },
    duration: 12,
    probability: 0.008
  },
  iconType: 'neutral',
  color: '#44aa88',
  animationType: 'bounce',
  eraPrerequisites: { maxStage: 1 },
  responses: [
    {
      id: 'welcome_migrants',
      label: 'Welcome Migrants',
      cost: { coin: 30, grain: 20 },
      effect: {
        citizenMood: { happiness: 8, stress: 0, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: 5, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Provide support for new arrivals'
    },
    {
      id: 'restrict_immigration',
      label: 'Restrict Immigration',
      cost: { coin: 15 },
      effect: {
        citizenMood: { happiness: -3, stress: -5, motivation: 0 },
        buildingEffects: { conditionChange: 0, efficiencyMultiplier: 1.0, maintenanceCostMultiplier: 1.0 },
        economicEffects: { growthRate: -3, wageMultiplier: 1.0, tradeMultiplier: 1.0 }
      },
      description: 'Limit new arrivals to reduce strain'
    }
  ],
  resolution: {
    description: 'New arrivals are organized into neighborhood councils that unlock district governance mitigations.',
    unlockMitigationId: 'district_councils',
    pressureAdjustments: { unrest: -0.5 }
  }
};

export default migrationWave;
