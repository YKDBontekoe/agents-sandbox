import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMousePointer, faArrowsAlt, faMagnifyingGlass } from '@/lib/icons';

interface Props {
  fps?: number;
  quality?: string;
}

export function StatusBar({ fps = 60, quality = 'High' }: Props) {
  return (
    <div className="bg-gray-800/90 backdrop-blur rounded-md border border-gray-700 px-4 py-2 shadow-lg text-gray-200">
      <div className="flex items-center justify-between text-xs">
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
            <span className="text-gray-400">Quality:</span>
            <span className={`font-medium ${quality === 'High' ? 'text-green-400' : quality === 'Medium' ? 'text-yellow-400' : 'text-rose-400'}`}>{quality}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">FPS:</span>
            <span className={`font-mono font-bold ${fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-rose-400'}`}>{fps}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
