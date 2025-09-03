import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMousePointer, faArrowsAlt, faMagnifyingGlass } from '@/lib/icons';

interface Props {
  fps?: number;
  quality?: string;
}

export function StatusBar({ fps = 60, quality = 'High' }: Props) {
  return (
    <div className="bg-white/85 backdrop-blur rounded-md border border-slate-200 px-4 py-2 shadow-lg">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faMousePointer} className="text-xs" />
            <span className="hidden sm:inline">Select</span>
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowsAlt} className="text-xs" />
            <span className="hidden sm:inline">Pan</span>
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
            <span className="hidden sm:inline">Zoom</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Quality:</span>
            <span className={`font-medium ${quality === 'High' ? 'text-green-700' : quality === 'Medium' ? 'text-yellow-700' : 'text-red-700'}`}>{quality}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">FPS:</span>
            <span className={`font-mono font-bold ${fps >= 55 ? 'text-green-700' : fps >= 30 ? 'text-yellow-700' : 'text-red-700'}`}>{fps}</span>
          </div>
        </div>
      </div>
    </div>
  );
}