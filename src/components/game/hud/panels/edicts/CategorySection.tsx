import React from 'react';
import { CategoryIcon, type CategoryType } from '@arcane/ui';

import { EdictControl } from './EdictControl';
import type { EdictWithState } from './useEdictsPanel';

interface CategorySectionProps {
  category: CategoryType;
  title: string;
  edicts: EdictWithState[];
  onChange: (edictId: string, value: number) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  title,
  edicts,
  onChange,
}) => {
  if (edicts.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby={`category-${category}`}>
      <h2 id={`category-${category}`} className="text-lg font-semibold text-white flex items-center gap-2">
        <CategoryIcon category={category} />
        {title}
      </h2>
      <div className="grid gap-4">
        {edicts.map(({ edict, pendingValue, hasChanged, cost, isLocked }) => (
          <EdictControl
            key={edict.id}
            edict={edict}
            pendingValue={pendingValue}
            hasChanged={hasChanged}
            cost={cost}
            isLocked={isLocked}
            onChange={(value) => onChange(edict.id, value)}
          />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
