import { describe, it, expect } from 'vitest';
import { getResourceIcon, getResourceColor, ResourceType } from './resourceUtils';

describe('resourceUtils', () => {
  const cases: { type: ResourceType; icon: string; color: string }[] = [
    { type: 'grain', icon: '🌾', color: 'text-yellow-600' },
    { type: 'coin', icon: '🪙', color: 'text-amber-500' },
    { type: 'mana', icon: '✨', color: 'text-purple-500' },
    { type: 'favor', icon: '👑', color: 'text-blue-500' },
    { type: 'unrest', icon: '⚡', color: 'text-red-500' },
    { type: 'threat', icon: '⚔️', color: 'text-red-700' },
  ];

  cases.forEach(({ type, icon, color }) => {
    it(`returns correct icon for ${type}`, () => {
      expect(getResourceIcon(type)).toBe(icon);
    });

    it(`returns correct color for ${type}`, () => {
      expect(getResourceColor(type)).toBe(color);
    });
  });
});
