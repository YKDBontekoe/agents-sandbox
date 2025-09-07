import React from 'react';
import type { OmenReading } from './types';

interface OmenReadingListProps {
  readings: OmenReading[];
  currentCycle: number;
}

const OmenReadingCard: React.FC<{ reading: OmenReading; currentCycle: number }> = ({ reading, currentCycle }) => {
  const age = currentCycle - reading.revealedAt;
  const isRecent = age <= 2;
  const isStale = age > 5;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-400';
    if (confidence >= 60) return 'text-amber-400';
    if (confidence >= 40) return 'text-orange-400';
    return 'text-rose-400';
  };

  return (
    <div className={`bg-purple-900/20 border border-purple-700/60 rounded-lg p-4 ${
      isRecent ? 'ring-1 ring-purple-700/40' : ''
    } ${isStale ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h3 className="text-purple-300 font-medium">{reading.title}</h3>
        </div>
        <div className="text-right">
          <div className={`text-xs font-mono ${getConfidenceColor(reading.confidence)}`}>
            {reading.confidence}% confidence
          </div>
          <div className="text-xs text-gray-400">
            Cycle {reading.revealedAt}
          </div>
        </div>
      </div>
      <p className="text-purple-300 text-sm italic">
        &ldquo;{reading.description}&rdquo;
      </p>
      {isRecent && (
        <div className="mt-2 text-xs text-purple-300">
          ✨ Recent vision
        </div>
      )}
    </div>
  );
};

const OmenReadingList: React.FC<OmenReadingListProps> = ({ readings, currentCycle }) => (
  <div className="space-y-3">
    {[...readings]
      .sort((a, b) => b.revealedAt - a.revealedAt)
      .slice(0, 5)
      .map((reading) => (
        <OmenReadingCard key={reading.id} reading={reading} currentCycle={currentCycle} />
      ))}
  </div>
);

export default OmenReadingList;
