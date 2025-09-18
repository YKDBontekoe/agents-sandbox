import type { EventDefinition, EventType } from '../types';

import naturalDisaster from './naturalDisaster';
import economicBoom from './economicBoom';
import resourceDiscovery from './resourceDiscovery';
import plagueOutbreak from './plagueOutbreak';
import tradeOpportunity from './tradeOpportunity';
import technologicalBreakthrough from './technologicalBreakthrough';
import socialUnrest from './socialUnrest';
import festival from './festival';
import weatherChange from './weatherChange';
import migrationWave from './migrationWave';
import constructionBoom from './constructionBoom';
import marketDay from './marketDay';
import culturalEvent from './culturalEvent';
import infrastructureUpgrade from './infrastructureUpgrade';
import voidRift from './voidRift';
import astralAlignment from './astralAlignment';
import councilSchism from './councilSchism';

export const EVENT_DEFINITIONS: Record<EventType, EventDefinition> = {
  natural_disaster: naturalDisaster,
  economic_boom: economicBoom,
  resource_discovery: resourceDiscovery,
  plague_outbreak: plagueOutbreak,
  trade_opportunity: tradeOpportunity,
  technological_breakthrough: technologicalBreakthrough,
  social_unrest: socialUnrest,
  festival,
  weather_change: weatherChange,
  migration_wave: migrationWave,
  construction_boom: constructionBoom,
  market_day: marketDay,
  cultural_event: culturalEvent,
  infrastructure_upgrade: infrastructureUpgrade,
  void_rift: voidRift,
  astral_alignment: astralAlignment,
  council_schism: councilSchism
};
