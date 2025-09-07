import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import type { SettingItem as SettingItemType } from './config';

interface SettingItemProps {
  setting: SettingItemType;
}

const SettingItem: React.FC<SettingItemProps> = ({ setting }) => {
  const renderControl = () => {
    switch (setting.type) {
      case 'toggle':
        return (
          <button
            onClick={() => setting.onChange(!setting.value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              setting.value ? 'bg-primary' : 'bg-border'
            }`}
            role="switch"
            aria-checked={Boolean(setting.value)}
            aria-labelledby={`setting-${setting.id}-label`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                setting.value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        );
      case 'select':
        return (
          <select
            value={String(setting.value)}
            onChange={(e) => setting.onChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            aria-labelledby={`setting-${setting.id}-label`}
          >
            {setting.options?.map(option => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'range':
        return (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={setting.min}
              max={setting.max}
              step={setting.step}
              value={Number(setting.value)}
              onChange={(e) => setting.onChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              aria-labelledby={`setting-${setting.id}-label`}
            />
            <span className="min-w-[3rem] text-sm font-mono text-gray-200 text-right">
              {setting.value}
            </span>
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            value={Number(setting.value)}
            onChange={(e) => setting.onChange(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 w-36"
            aria-labelledby={`setting-${setting.id}-label`}
          />
        );
      case 'preset':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {setting.options?.map(option => (
              <button
                key={String(option.value)}
                onClick={() => setting.onChange(option.value)}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm font-medium ${
                  setting.value === option.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:border-blue-500/50'
                }`}
                aria-pressed={setting.value === option.value}
              >
                {setting.value === option.value && (
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                )}
                {option.label}
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-gray-900/20 rounded-lg border border-gray-700 hover:bg-gray-900/30 transition-colors duration-200">
      <div className="flex-1">
        <label
          id={`setting-${setting.id}-label`}
          className="block font-medium text-gray-200 mb-1"
        >
          {setting.name}
        </label>
        <p className="text-xs text-gray-400">{setting.description}</p>
      </div>
      <div className="flex-shrink-0">
        {renderControl()}
      </div>
    </div>
  );
};

export default SettingItem;

