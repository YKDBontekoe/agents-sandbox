import type { ActiveEvent, EventType } from '../types';

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

export {
  naturalDisaster,
  economicBoom,
  resourceDiscovery,
  plagueOutbreak,
  tradeOpportunity,
  technologicalBreakthrough,
  socialUnrest,
  festival,
  weatherChange,
  migrationWave,
  constructionBoom,
  marketDay,
  culturalEvent,
  infrastructureUpgrade,
};

export const EVENT_DEFINITIONS: Record<EventType, Omit<ActiveEvent, 'id' | 'startCycle' | 'endCycle' | 'isActive'>> = {
  natural_disaster: naturalDisaster,
  economic_boom: economicBoom,
  resource_discovery: resourceDiscovery,
  plague_outbreak: plagueOutbreak,
  trade_opportunity: tradeOpportunity,
  technological_breakthrough: technologicalBreakthrough,
  social_unrest: socialUnrest,
  festival: festival,
  weather_change: weatherChange,
  migration_wave: migrationWave,
  construction_boom: constructionBoom,
  market_day: marketDay,
  cultural_event: culturalEvent,
  infrastructure_upgrade: infrastructureUpgrade,
};

export default EVENT_DEFINITIONS;
