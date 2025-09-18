import type { EventDefinition } from '../types';

const astralAlignment: EventDefinition = {
  type: 'astral_alignment',
  severity: 'major',
  title: 'Astral Alignment',
  description:
    'Ley lines sing in harmony as distant constellations align, offering a fleeting surge of power to the Dominion.',
  impact: {
    resources: { mana: 30, favor: 6 },
    citizenMood: { happiness: 14, stress: -10, motivation: 12 },
    buildingEffects: { conditionChange: 8, efficiencyMultiplier: 1.15, maintenanceCostMultiplier: 0.85 },
    economicEffects: { wageMultiplier: 1.05, tradeMultiplier: 1.15, growthRate: 0.12 },
    duration: 4,
    probability: 0.06
  },
  iconType: 'positive',
  color: '#38bdf8',
  animationType: 'glow',
  eraPrerequisites: { minStage: 1 },
  responses: [
    {
      id: 'channel_alignment',
      label: 'Channel the convergence',
      cost: { mana: 10 },
      effect: {
        resources: { mana: 25, favor: 4 },
        citizenMood: { happiness: 6, stress: -4, motivation: 4 },
        buildingEffects: { conditionChange: 4, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 0.9 },
        duration: 1
      },
      description: 'Focus the alignment into your ritual lattice, extending its boon and brightening morale.'
    },
    {
      id: 'stabilize_alignment',
      label: 'Stabilize the lattice',
      cost: { coin: 35, planks: 20 },
      effect: {
        citizenMood: { happiness: 4, stress: -6, motivation: 5 },
        buildingEffects: { conditionChange: 6, efficiencyMultiplier: 1.08, maintenanceCostMultiplier: 0.88 },
        duration: 0
      },
      description: 'Invest in lattice tuning to hold the alignment longer and dampen the threat horizon.'
    }
  ],
  resolution: {
    description: 'Your sages codify new sigils, permanently lightening mana upkeep this era.',
    pressureAdjustments: { manaUpkeep: -1 }
  }
};

export default astralAlignment;
