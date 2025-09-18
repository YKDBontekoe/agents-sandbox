import type { EventDefinition } from '../types';

const councilSchism: EventDefinition = {
  type: 'council_schism',
  severity: 'major',
  title: 'Council Schism',
  description:
    'Faction leaders walk out of council chambers, threatening to form rival courts unless their demands are met.',
  impact: {
    resources: { favor: -12, coin: -20 },
    citizenMood: { happiness: -12, stress: 18, motivation: -8 },
    buildingEffects: { conditionChange: -6, efficiencyMultiplier: 0.92, maintenanceCostMultiplier: 1.1 },
    economicEffects: { wageMultiplier: 1.02, tradeMultiplier: 0.88, growthRate: -0.08 },
    duration: 4,
    probability: 0.07
  },
  iconType: 'warning',
  color: '#f97316',
  animationType: 'pulse',
  eraPrerequisites: { minStage: 1 },
  responses: [
    {
      id: 'mediate',
      label: 'Broker a compromise',
      cost: { favor: 10, coin: 25 },
      effect: {
        citizenMood: { happiness: 6, stress: -6, motivation: 4 },
        buildingEffects: { conditionChange: 2, efficiencyMultiplier: 1.04, maintenanceCostMultiplier: 0.96 },
        duration: -1
      },
      description: 'Host an emergency summit and concede minor reforms to restore unity.'
    },
    {
      id: 'purge',
      label: 'Purge dissidents',
      cost: { mana: 25 },
      effect: {
        resources: { favor: -4 },
        citizenMood: { happiness: -4, stress: 12, motivation: -2 },
        buildingEffects: { conditionChange: -3, efficiencyMultiplier: 0.95, maintenanceCostMultiplier: 1.05 },
        duration: 0
      },
      description: 'Invoke emergency powers to silence dissent, risking long-term resentment.'
    }
  ],
  resolution: {
    description: 'The schism forges a Charter of Balance, unlocking new civic councils to dampen unrest.',
    unlockMitigationId: 'district_councils',
    pressureAdjustments: { unrest: -1 }
  }
};

export default councilSchism;
