import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';

interface GameSettings {
  showHelp: boolean;
  sound: boolean;
  darkMode: boolean;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onChange: (key: keyof GameSettings, value: boolean) => void;
}

const ToggleRow: React.FC<{ id: string; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }> = ({ id, label, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between py-2">
    <label htmlFor={id} className="text-sm text-slate-700 mr-4">
      {label}
    </label>
    <Switch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="w-10 h-6 bg-slate-200 rounded-full relative data-[state=checked]:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
    >
      <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-1 data-[state=checked]:translate-x-5" />
    </Switch.Root>
  </div>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onChange }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-slate-900">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-500 hover:text-slate-900 p-1 rounded hover:bg-slate-100" aria-label="Close">
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="p-6 space-y-2">
            <ToggleRow
              id="help-toggle"
              label="Show Help Overlay"
              checked={settings.showHelp}
              onCheckedChange={(c) => onChange('showHelp', c)}
            />
            <ToggleRow
              id="sound-toggle"
              label="Sound Effects"
              checked={settings.sound}
              onCheckedChange={(c) => onChange('sound', c)}
            />
            <ToggleRow
              id="dark-toggle"
              label="Dark Mode"
              checked={settings.darkMode}
              onCheckedChange={(c) => onChange('darkMode', c)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SettingsPanel;
