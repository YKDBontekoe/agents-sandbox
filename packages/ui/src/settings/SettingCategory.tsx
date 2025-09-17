import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { SettingCategory as SettingCategoryType } from './types';
import SettingItem from './SettingItem';

interface SettingCategoryProps {
  category: SettingCategoryType;
  isExpanded: boolean;
  onToggle: () => void;
  searchTerm: string;
  renderCustom?: () => React.ReactNode;
}

const SettingCategory: React.FC<SettingCategoryProps> = ({
  category,
  isExpanded,
  onToggle,
  searchTerm,
  renderCustom,
}) => {
  const filteredSettings = useMemo(() => {
    if (!searchTerm) return category.settings;
    return category.settings.filter(setting =>
      setting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [category.settings, searchTerm]);

  if (searchTerm && filteredSettings.length === 0) return null;

  return (
    <div className="mb-4 bg-gray-900/30 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-800/80 hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset text-gray-200"
        aria-expanded={isExpanded}
        aria-controls={`category-${category.id}`}
      >
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={category.icon} className="text-primary" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-100">{category.name}</h3>
            <p className="text-xs text-gray-400">{category.description}</p>
          </div>
        </div>
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          className="text-gray-400 transition-transform duration-200"
        />
      </button>

      {isExpanded && (
        <div id={`category-${category.id}`} className="p-4 space-y-4 animate-slide-down">
          {category.id === 'inbox' && renderCustom ? (
            renderCustom()
          ) : (
            filteredSettings.map(setting => (
              <SettingItem key={setting.id} setting={setting} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SettingCategory;

