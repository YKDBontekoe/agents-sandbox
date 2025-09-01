import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS, COLORS, type ResourceType } from '../../lib/resources';

export type { ResourceType } from '../../lib/resources';

export function getResourceIcon(resource: ResourceType): IconDefinition {
  return ICONS[resource];
}

export function getResourceColor(resource: ResourceType): string {
  return COLORS[resource];
}
