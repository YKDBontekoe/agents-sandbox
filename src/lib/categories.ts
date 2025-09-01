import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faSackDollar,
  faShieldHalved,
  faUsers,
  faHatWizard,
  faHandshake,
  faLandmark
} from '@/lib/icons';

export type CategoryType =
  | 'economic'
  | 'military'
  | 'social'
  | 'mystical'
  | 'diplomatic'
  | 'infrastructure';

export const CATEGORY_TYPES: CategoryType[] = [
  'economic',
  'military',
  'social',
  'mystical',
  'diplomatic',
  'infrastructure',
];

export const CATEGORY_ICONS: Record<CategoryType, IconDefinition> = {
  economic: faSackDollar,
  military: faShieldHalved,
  social: faUsers,
  mystical: faHatWizard,
  diplomatic: faHandshake,
  infrastructure: faLandmark,
};
