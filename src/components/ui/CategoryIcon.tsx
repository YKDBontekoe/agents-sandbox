import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faSackDollar,
  faShieldHalved,
  faUsers,
  faHatWizard
} from '@/lib/icons';

export type CategoryType = 'economic' | 'military' | 'social' | 'mystical';

export interface CategoryIconProps {
  category: CategoryType;
  className?: string;
}

const ICONS: Record<CategoryType, IconDefinition> = {
  economic: faSackDollar,
  military: faShieldHalved,
  social: faUsers,
  mystical: faHatWizard,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'text-lg' }) => (
  <FontAwesomeIcon icon={ICONS[category]} className={className} />
);

export default CategoryIcon;
