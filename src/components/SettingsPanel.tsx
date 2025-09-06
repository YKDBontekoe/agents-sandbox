'use client';

import type { ChangeEvent } from 'react';
import { LayoutPreset } from '@/lib/preferences';

interface SettingsPanelProps {
  preset: LayoutPreset;
  onPresetChange: (preset: LayoutPreset) => void;
}

export default function SettingsPanel({ preset, onPresetChange }: SettingsPanelProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as LayoutPreset;
    onPresetChange(value);
  };

  return (
    <aside className="h-full border-l border-gray-700 bg-gray-800 p-4 overflow-y-auto text-gray-200">
      <h2 className="text-gray-100 font-semibold mb-4">Settings</h2>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="layout"
            value="compact"
            checked={preset === 'compact'}
            onChange={handleChange}
          />
          <span className="text-sm text-gray-300">Compact</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="layout"
            value="expanded"
            checked={preset === 'expanded'}
            onChange={handleChange}
          />
          <span className="text-sm text-gray-300">Expanded</span>
        </label>
      </div>
    </aside>
  );
}
