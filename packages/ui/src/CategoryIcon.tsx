import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CATEGORY_ICONS, CategoryType } from './categories';

export interface CategoryIconProps {
  category: CategoryType;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'text-lg' }) => (
  <FontAwesomeIcon icon={CATEGORY_ICONS[category]} className={className} />
);

export default CategoryIcon;
