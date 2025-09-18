import type { EventDefinition } from '../types';

const voidRift: EventDefinition = {
  type: 'void_rift',
  severity: 'critical',
  title: 'Void Rift Tears Open',
  description:
    'A shrieking tear yawns above the outer wards, spilling voidlight and galvanizing the cults who beckoned it forth.',
  impact: {
    resources: { mana: -25, favor: -8 },
    citizenMood: { happiness: -18, stress: 25, motivation: -15 },
    buildingEffects: { conditionChange: -15, efficiencyMultiplier: 0.85, maintenanceCostMultiplier: 1.5 },
    economicEffects: { wageMultiplier: 1.1, tradeMultiplier: 0.85, growthRate: -0.2 },
    duration: 5,
    probability: 0.04
  },
  iconType: 'critical',
  color: '#7c3aed',
  animationType: 'shake',
  eraPrerequisites: { minStage: 2 },
  responses: [
    {
      id: 'seal_ritual',
      label: 'Conduct a sealing ritual',
      cost: { mana: 60, favor: 15 },
      effect: {
        resources: { mana: 20, favor: 5 },
        citizenMood: { happiness: 8, stress: -12, motivation: 6 },
        buildingEffects: { conditionChange: 5, efficiencyMultiplier: 1.05, maintenanceCostMultiplier: 0.95 },
        duration: -2
      },
      description: 'Commit the council to a night-long working that stitches the tear shut before it destabilizes the city.'
    },
    {
      id: 'containment_sacrifice',
      label: 'Evacuate and collapse the district',
      cost: { grain: 40, coin: 30 },
      effect: {
        citizenMood: { happiness: -6, stress: 10, motivation: -4 },
        buildingEffects: { conditionChange: -5, efficiencyMultiplier: 0.9, maintenanceCostMultiplier: 1.2 },
        duration: -1
      },
      description: 'Detonate the ward pylons, sacrificing a district to starve the rift while the populace watches in terror.'
    }
  ],
  resolution: {
    description: 'Closing the rift teaches your wardens to harden the astral lattice against future incursions.',
    unlockMitigationId: 'astral_circuit',
    pressureAdjustments: { threat: -1 }
  }
};

export default voidRift;
