import { describe, it, expect } from 'vitest';
import { getResourceIcon, getResourceColor } from './resourceUtils';
import { ICONS, COLORS, type ResourceType } from '../../lib/resources';

describe('resourceUtils', () => {
  const types = Object.keys(ICONS) as ResourceType[];

  types.forEach((type) => {
    it(`returns correct icon for ${type}`, () => {
      expect(getResourceIcon(type)).toBe(ICONS[type]);
    });

    it(`returns correct color for ${type}`, () => {
      expect(getResourceColor(type)).toBe(COLORS[type]);
    });
  });
});
