'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ResponsiveText } from '../hud/ResponsiveHUDPanels';
import type { CityStats } from './config';
import { cityIcons } from './config';

interface CityStatsDisplayProps {
  stats: CityStats;
}

const CityStatsDisplay: React.FC<CityStatsDisplayProps> = ({ stats }) => {
  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return cityIcons.arrowUp;
      case 'down':
        return cityIcons.arrowDown;
      default:
        return cityIcons.arrowUp;
    }
  };

  const previousStats = {
    population: stats.population * 0.95,
    happiness: stats.happiness * 1.02,
    budget: stats.budget * 0.98,
  };

  const populationTrend = getTrend(stats.population, previousStats.population);
  const happinessTrend = getTrend(stats.happiness, previousStats.happiness);

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={cityIcons.users} className="text-blue-400 text-lg" />
            <FontAwesomeIcon
              icon={getTrendIcon(populationTrend)}
              className={`text-xs ${getTrendColor(populationTrend)}`}
            />
          </div>
          <ResponsiveText className="text-2xl font-bold text-white">
            {stats.population.toLocaleString()}
          </ResponsiveText>
          <ResponsiveText className="text-sm text-gray-400">Population</ResponsiveText>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <FontAwesomeIcon icon={cityIcons.smile} className="text-green-400 text-lg" />
            <FontAwesomeIcon
              icon={getTrendIcon(happinessTrend)}
              className={`text-xs ${getTrendColor(happinessTrend)}`}
            />
          </div>
          <ResponsiveText className="text-2xl font-bold text-white">
            {stats.happiness}%
          </ResponsiveText>
          <ResponsiveText className="text-sm text-gray-400">Happiness</ResponsiveText>
        </div>
      </div>

      {/* City Health */}
      <div className="space-y-3">
        <ResponsiveText className="text-lg font-semibold text-white">City Health</ResponsiveText>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={cityIcons.car} className="text-yellow-400" />
              <ResponsiveText className="text-sm text-gray-300">Traffic</ResponsiveText>
            </div>
            <ResponsiveText className="text-sm font-medium text-yellow-400">{stats.traffic}%</ResponsiveText>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={cityIcons.smog} className="text-red-400" />
              <ResponsiveText className="text-sm text-gray-300">Pollution</ResponsiveText>
            </div>
            <ResponsiveText className="text-sm font-medium text-red-400">{stats.pollution}%</ResponsiveText>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={cityIcons.shield} className="text-blue-400" />
              <ResponsiveText className="text-sm text-gray-300">Crime</ResponsiveText>
            </div>
            <ResponsiveText className="text-sm font-medium text-blue-400">{stats.crime}%</ResponsiveText>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="space-y-3">
        <ResponsiveText className="text-lg font-semibold text-white">Services</ResponsiveText>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={cityIcons.gradCap} className="text-purple-400" />
              <ResponsiveText className="text-sm text-gray-300">Education</ResponsiveText>
            </div>
            <ResponsiveText className="text-sm font-medium text-purple-400">{stats.education}%</ResponsiveText>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={cityIcons.hospital} className="text-green-400" />
              <ResponsiveText className="text-sm text-gray-300">Healthcare</ResponsiveText>
            </div>
            <ResponsiveText className="text-sm font-medium text-green-400">{stats.healthcare}%</ResponsiveText>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="space-y-3">
        <ResponsiveText className="text-lg font-semibold text-white">Financial Overview</ResponsiveText>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <ResponsiveText className="text-sm text-gray-300">Income</ResponsiveText>
            <ResponsiveText className="text-sm font-medium text-green-400">+${stats.income}</ResponsiveText>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <ResponsiveText className="text-sm text-gray-300">Expenses</ResponsiveText>
            <ResponsiveText className="text-sm font-medium text-red-400">-${stats.expenses}</ResponsiveText>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
            <ResponsiveText className="text-sm text-gray-300">Net Income</ResponsiveText>
            <ResponsiveText
              className={`text-sm font-medium ${
                stats.income - stats.expenses >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              ${stats.income - stats.expenses >= 0 ? '+' : ''}{stats.income - stats.expenses}
            </ResponsiveText>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityStatsDisplay;
