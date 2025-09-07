import React from 'react';
import type { SeasonalEvent } from './types';

export const SeasonIcon: React.FC<{ season: SeasonalEvent['season'] }> = ({ season }) => {
  const icons = {
    spring: '🌸',
    summer: '☀️',
    autumn: '🍂',
    winter: '❄️',
  } as const;
  return <span role="img" aria-label={season}>{icons[season]}</span>;
};

export const EventTypeIcon: React.FC<{ type: SeasonalEvent['type'] }> = ({ type }) => {
  const icons = {
    blessing: '✨',
    curse: '💀',
    neutral: '⚖️',
    crisis: '🔥',
  } as const;
  return <span role="img" aria-label={type}>{icons[type]}</span>;
};
