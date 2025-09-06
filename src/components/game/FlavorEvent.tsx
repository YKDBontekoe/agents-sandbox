import { FlavorEventDef } from './flavorEvents';
import { ResourceIcon } from '../ui';
import type { ResourceType } from '@/lib/resources';

interface Props {
  event: FlavorEventDef;
  onClose: () => void;
}

export default function FlavorEvent({ event, onClose }: Props) {
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-4 max-w-sm w-[90vw] sm:w-auto text-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-gray-100">
            {event.message}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 rounded p-1 hover:bg-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {event.delta && Object.keys(event.delta).length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(event.delta).map(([key, value]) => (
              <ResourceIcon
                key={key}
                type={key as ResourceType}
                value={value!}
                delta={value!}
                className="text-sm"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
