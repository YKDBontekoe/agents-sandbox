import { FlavorEventDef } from './flavorEvents';
import { getResourceColor, getResourceIcon, ResourceType } from './resourceUtils';

interface Props {
  event: FlavorEventDef;
  onClose: () => void;
}

export default function FlavorEvent({ event, onClose }: Props) {
  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg p-4 max-w-sm w-[90vw] sm:w-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="text-sm text-slate-800">
            {event.message}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 rounded p-1 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {event.delta && Object.keys(event.delta).length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {Object.entries(event.delta).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <span className={getResourceColor(key as ResourceType)}>{getResourceIcon(key as ResourceType)}</span>
                <span className="font-mono">{value! >= 0 ? '+' : ''}{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
