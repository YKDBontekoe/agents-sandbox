'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCity,
  faUsers,
  faSmile,
  faCar,
  faSmog,
  faShieldAlt,
  faGraduationCap,
  faHospital,
  faBriefcase,
  faCoins,
  faArrowUp,
  faArrowDown,
  faPlay,
  faPause,
  faTools,
  faHome,
  faIndustry,
  faStore,
  faRoad,
  faTrash,
  faLevelUpAlt,
  faTimes,
  faChartLine,
  faExclamationTriangle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { ResponsivePanel, ResponsiveText, ResponsiveButton, ResponsiveGrid } from './hud/ResponsiveHUDPanels';

// Types and interfaces
export interface CityStats {
  population: number;
  happiness: number;
  traffic: number;
  pollution: number;
  crime: number;
  education: number;
  healthcare: number;
  employment: number;
  budget: number;
  income: number;
  expenses: number;
}

export type ManagementTool = 'select' | 'zone_residential' | 'zone_commercial' | 'zone_industrial' | 'build_road' | 'build_service' | 'demolish' | 'upgrade';

export type ZoneType = 'residential' | 'commercial' | 'industrial';

export type ServiceType = 'police' | 'fire' | 'hospital' | 'school' | 'park';

export interface CityManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: CityStats;
  selectedTool: ManagementTool;
  onToolSelect: (tool: ManagementTool) => void;
  selectedZoneType: ZoneType;
  onZoneTypeSelect: (zoneType: ZoneType) => void;
  selectedServiceType: ServiceType;
  onServiceTypeSelect: (serviceType: ServiceType) => void;
  isSimulationRunning: boolean;
  onToggleSimulation: () => void;
  onResetCity?: () => void;
  className?: string;
}

const CityManagementPanel: React.FC<CityManagementPanelProps> = ({
  isOpen,
  onClose,
  stats,
  selectedTool,
  onToolSelect,
  selectedZoneType,
  onZoneTypeSelect,
  selectedServiceType,
  onServiceTypeSelect,
  isSimulationRunning,
  onToggleSimulation,
  onResetCity,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'statistics' | 'tools' | 'zones' | 'services'>('statistics');

  // Calculate trends
  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return faArrowUp;
      case 'down': return faArrowDown;
      default: return faArrowUp;
    }
  };

  // Mock previous values for trend calculation
  const previousStats = {
    population: stats.population * 0.95,
    happiness: stats.happiness * 1.02,
    budget: stats.budget * 0.98
  };

  const populationTrend = getTrend(stats.population, previousStats.population);
  const happinessTrend = getTrend(stats.happiness, previousStats.happiness);
  const budgetTrend = getTrend(stats.budget, previousStats.budget);

  const tabs = [
    { id: 'statistics', label: 'Stats', icon: faChartLine, color: 'blue' },
    { id: 'tools', label: 'Tools', icon: faTools, color: 'purple' },
    { id: 'zones', label: 'Zones', icon: faHome, color: 'green' },
    { id: 'services', label: 'Services', icon: faShieldAlt, color: 'orange' }
  ];

  if (!isOpen) return null;

  return (
    <ResponsivePanel className={`w-full bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border-b border-gray-700/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-400/30 shadow-lg">
                <FontAwesomeIcon icon={faCity} className="text-blue-400 text-xl" />
              </div>
              <div>
                <ResponsiveText className="text-xl font-bold text-white">
                  City Management
                </ResponsiveText>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isSimulationRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <ResponsiveText className="text-sm text-gray-400">
                    {isSimulationRunning ? 'Running' : 'Paused'}
                  </ResponsiveText>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ResponsiveButton
                onClick={onToggleSimulation}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isSimulationRunning 
                    ? 'bg-red-500/20 border-red-400/30 text-red-400 hover:bg-red-500/30' 
                    : 'bg-green-500/20 border-green-400/30 text-green-400 hover:bg-green-500/30'
                }`}
              >
                <FontAwesomeIcon icon={isSimulationRunning ? faPause : faPlay} className="text-sm" />
              </ResponsiveButton>
              <ResponsiveButton
                onClick={onClose}
                className="p-3 rounded-xl border border-gray-600/50 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </ResponsiveButton>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="relative bg-gray-800/30 border-b border-gray-700/50">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-white bg-gray-700/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={tab.icon} className="text-sm" />
                <span className="hidden md:inline font-medium">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r shadow-lg bg-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'statistics' && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <FontAwesomeIcon icon={faUsers} className="text-blue-400 text-lg" />
                  <FontAwesomeIcon icon={getTrendIcon(populationTrend)} className={`text-xs ${getTrendColor(populationTrend)}`} />
                </div>
                <ResponsiveText className="text-2xl font-bold text-white">
                  {stats.population.toLocaleString()}
                </ResponsiveText>
                <ResponsiveText className="text-sm text-gray-400">Population</ResponsiveText>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <FontAwesomeIcon icon={faSmile} className="text-green-400 text-lg" />
                  <FontAwesomeIcon icon={getTrendIcon(happinessTrend)} className={`text-xs ${getTrendColor(happinessTrend)}`} />
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
                    <FontAwesomeIcon icon={faCar} className="text-yellow-400" />
                    <ResponsiveText className="text-sm text-gray-300">Traffic</ResponsiveText>
                  </div>
                  <ResponsiveText className="text-sm font-medium text-yellow-400">{stats.traffic}%</ResponsiveText>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faSmog} className="text-red-400" />
                    <ResponsiveText className="text-sm text-gray-300">Pollution</ResponsiveText>
                  </div>
                  <ResponsiveText className="text-sm font-medium text-red-400">{stats.pollution}%</ResponsiveText>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400" />
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
                    <FontAwesomeIcon icon={faGraduationCap} className="text-purple-400" />
                    <ResponsiveText className="text-sm text-gray-300">Education</ResponsiveText>
                  </div>
                  <ResponsiveText className="text-sm font-medium text-purple-400">{stats.education}%</ResponsiveText>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faHospital} className="text-green-400" />
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
                  <ResponsiveText className={`text-sm font-medium ${stats.income - stats.expenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${stats.income - stats.expenses >= 0 ? '+' : ''}${stats.income - stats.expenses}
                  </ResponsiveText>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            <ResponsiveText className="text-lg font-semibold text-white mb-4">
              Management Tools
            </ResponsiveText>
            <div className="grid grid-cols-2 gap-3">
              {[
                { tool: 'select', icon: faCheckCircle, label: 'Select', color: 'blue' },
                { tool: 'build_road', icon: faRoad, label: 'Build Road', color: 'gray' },
                { tool: 'demolish', icon: faTrash, label: 'Demolish', color: 'red' },
                { tool: 'upgrade', icon: faLevelUpAlt, label: 'Upgrade', color: 'green' }
              ].map((item) => (
                <ResponsiveButton
                  key={item.tool}
                  onClick={() => onToolSelect(item.tool as ManagementTool)}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    selectedTool === item.tool
                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                      : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FontAwesomeIcon icon={item.icon} className="text-xl" />
                    <ResponsiveText className="text-sm font-medium">
                      {item.label}
                    </ResponsiveText>
                  </div>
                </ResponsiveButton>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'zones' && (
          <div className="space-y-4">
            <ResponsiveText className="text-lg font-semibold text-white mb-4">
              Zone Types
            </ResponsiveText>
            <div className="space-y-3">
              {[
                { zone: 'residential', icon: faHome, label: 'Residential Zone', color: 'green', desc: 'Housing for citizens' },
                { zone: 'commercial', icon: faStore, label: 'Commercial Zone', color: 'blue', desc: 'Shops and businesses' },
                { zone: 'industrial', icon: faIndustry, label: 'Industrial Zone', color: 'orange', desc: 'Factories and production' }
              ].map((item) => (
                <div
                  key={item.zone}
                  className={`p-4 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                    selectedZoneType === item.zone
                      ? 'bg-blue-500/20 border-blue-400/50'
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                  onClick={() => onZoneTypeSelect(item.zone as ZoneType)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      selectedZoneType === item.zone
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700/50 text-gray-400'
                    }`}>
                      <FontAwesomeIcon icon={item.icon} className="text-xl" />
                    </div>
                    <div>
                      <ResponsiveText className={`font-medium ${
                        selectedZoneType === item.zone ? 'text-blue-400' : 'text-white'
                      }`}>
                        {item.label}
                      </ResponsiveText>
                      <ResponsiveText className="text-sm text-gray-400">
                        {item.desc}
                      </ResponsiveText>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            <ResponsiveText className="text-lg font-semibold text-white mb-4">
              City Services
            </ResponsiveText>
            <div className="grid grid-cols-2 gap-3">
              {[
                { service: 'police', icon: faShieldAlt, label: 'Police', color: 'blue' },
                { service: 'fire', icon: faExclamationTriangle, label: 'Fire Dept', color: 'red' },
                { service: 'hospital', icon: faHospital, label: 'Hospital', color: 'green' },
                { service: 'school', icon: faGraduationCap, label: 'School', color: 'purple' }
              ].map((item) => (
                <ResponsiveButton
                  key={item.service}
                  onClick={() => onServiceTypeSelect(item.service as ServiceType)}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    selectedServiceType === item.service
                      ? 'bg-blue-500/20 border-blue-400/50 text-blue-400'
                      : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FontAwesomeIcon icon={item.icon} className="text-xl" />
                    <ResponsiveText className="text-sm font-medium">
                      {item.label}
                    </ResponsiveText>
                  </div>
                </ResponsiveButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-700/50 p-4 bg-gray-800/30">
        <div className="flex items-center justify-between">
          <ResponsiveText className="text-xs text-gray-500">
            City Management v2.0
          </ResponsiveText>
          {onResetCity && (
            <ResponsiveButton
              onClick={onResetCity}
              className="px-3 py-1 text-xs bg-red-500/20 border border-red-400/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTrash} className="text-sm" />
              <span className="text-sm font-medium">Reset</span>
            </ResponsiveButton>
          )}
        </div>
      </div>
    </ResponsivePanel>
  );
};

export default CityManagementPanel;