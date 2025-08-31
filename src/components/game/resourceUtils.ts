export type ResourceType = 'grain' | 'coin' | 'mana' | 'favor' | 'unrest' | 'threat';

export function getResourceIcon(resource: ResourceType): string {
  switch (resource) {
    case 'grain':
      return '🌾';
    case 'coin':
      return '🪙';
    case 'mana':
      return '✨';
    case 'favor':
      return '👑';
    case 'unrest':
      return '⚡';
    case 'threat':
      return '⚔️';
    default:
      return '?';
  }
}

export function getResourceColor(resource: ResourceType): string {
  switch (resource) {
    case 'grain':
      return 'text-yellow-600';
    case 'coin':
      return 'text-amber-500';
    case 'mana':
      return 'text-purple-500';
    case 'favor':
      return 'text-blue-500';
    case 'unrest':
      return 'text-red-500';
    case 'threat':
      return 'text-red-700';
    default:
      return 'text-gray-500';
  }
}
