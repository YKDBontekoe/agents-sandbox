import React from 'react';

interface Props {
  onOpenCouncil?: () => void;
  onOpenEdicts?: () => void;
  onOpenOmens?: () => void;
  onOpenSettings?: () => void;
}

export function ActionPanel({ onOpenCouncil, onOpenEdicts, onOpenOmens, onOpenSettings }: Props) {
  const Item = ({ label, onClick }: { label: string; onClick?: () => void }) => (
    <button
      className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 active:bg-gray-600 border border-transparent hover:border-gray-600 text-gray-200"
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <nav aria-label="Actions" className="bg-gray-800/90 backdrop-blur rounded-md border border-gray-700 p-2 w-48 text-sm select-none text-gray-200">
      <header className="px-2 py-1 text-xs uppercase tracking-wide text-gray-400">Actions</header>
      <div className="flex flex-col">
        <Item label="Council" onClick={onOpenCouncil} />
        <Item label="Edicts" onClick={onOpenEdicts} />
        <Item label="Omens" onClick={onOpenOmens} />
        <Item label="Settings" onClick={onOpenSettings} />
      </div>
    </nav>
  );
}
