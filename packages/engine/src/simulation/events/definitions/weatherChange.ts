import type { EventDefinition } from '../types';

const weatherChange: EventDefinition = {
  type: 'weather_change',
  severity: 'minor',
  title: 'Weather Change',
  description: 'Unusual weather patterns affect agricultural and construction activities.',
  impact: {
    resources: { grain: -15, planks: -10 },
    citizenMood: { happiness: -5, stress: 5, motivation: 0 },
    buildingEffects: { conditionChange: 0, efficiencyMultiplier: 0.9, maintenanceCostMultiplier: 1.1 },
    economicEffects: { wageMultiplier: 1.0, tradeMultiplier: 0.95, growthRate: -2 },
    duration: 5,
    probability: 0.02
  },
  iconType: 'neutral',
  color: '#888888',
  animationType: 'pulse',
  eraPrerequisites: { maxStage: 1 },
  resolution: {
    description: 'Skywatchers refine their forecasts, softening unrest caused by future storms.',
    pressureAdjustments: { unrest: -0.2 }
  }
};

export default weatherChange;
