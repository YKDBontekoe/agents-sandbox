import 'server-only';

import { loadPluginsSync } from './plugins';
import { CORE_BUILDINGS, type SimBuildingType } from '@/lib/buildingCatalog';
import { CORE_RESOURCES, type ResourceDef } from '@/lib/resources';
import { CORE_GUILDS, type GuildDef } from '@/lib/guilds';
import type { ResourceSpec, GuildAgentSpec } from './plugins';

const plugins = loadPluginsSync();

const buildingCatalog: Record<string, SimBuildingType> = { ...CORE_BUILDINGS };
const resourceCatalog: Record<string, ResourceDef> = { ...CORE_RESOURCES };
const guildCatalog: Record<string, GuildDef> = { ...CORE_GUILDS };

for (const p of plugins) {
  if (p.buildings) {
    Object.assign(buildingCatalog, p.buildings);
  }
  if (p.resources) {
    for (const [k, v] of Object.entries(p.resources)) {
      const spec = v as ResourceSpec;
      resourceCatalog[k] = { icon: spec.icon as any, color: spec.color };
    }
  }
  if (p.guildAgents) {
    Object.assign(guildCatalog, p.guildAgents as Record<string, GuildAgentSpec>);
  }
}

export const BUILDING_CATALOG = buildingCatalog;
export const RESOURCE_CATALOG = resourceCatalog;
export const GUILD_CATALOG = guildCatalog;

export type { SimBuildingType, ResourceDef, GuildDef };
