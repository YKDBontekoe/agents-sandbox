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
    <aside className="h-full border-l border-slate-200 bg-white p-4 overflow-y-auto">
      <h2 className="text-slate-900 font-semibold mb-4">Settings</h2>
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="layout"
            value="compact"
            checked={preset === 'compact'}
            onChange={handleChange}
          />
          <span className="text-sm text-slate-700">Compact</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="layout"
            value="expanded"
            checked={preset === 'expanded'}
            onChange={handleChange}
          />
          <span className="text-sm text-slate-700">Expanded</span>
        </label>
      </div>
    </aside>
  );
}
