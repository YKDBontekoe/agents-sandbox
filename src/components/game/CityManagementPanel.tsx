'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  ResponsivePanel,
  ResponsiveText,
  ResponsiveButton,
} from './hud/ResponsiveHUDPanels';
import {
  cityIcons,
  tabs,
  type TabId,
  type CityStats,
  type ManagementTool,
  type ZoneType,
  type ServiceType,
} from './city/config';
import CityStatsDisplay from './city/CityStatsDisplay';
import ToolSelector from './city/ToolSelector';
import ZoneServiceControls from './city/ZoneServiceControls';

export type { CityStats, ManagementTool, ZoneType, ServiceType } from './city/config';

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
  const [activeTab, setActiveTab] = useState<TabId>('statistics');

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
                <FontAwesomeIcon icon={cityIcons.city} className="text-blue-400 text-xl" />
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
                <FontAwesomeIcon
                  icon={isSimulationRunning ? cityIcons.pause : cityIcons.play}
                  className="text-sm"
                />
              </ResponsiveButton>
              <ResponsiveButton
                onClick={onClose}
                className="p-3 rounded-xl border border-gray-600/50 text-gray-400 hover:bg-gray-700/50 hover:text-white transition-all duration-200"
              >
                <FontAwesomeIcon icon={cityIcons.times} className="text-sm" />
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
              onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'statistics' && <CityStatsDisplay stats={stats} />}

        {activeTab === 'tools' && (
          <ToolSelector selectedTool={selectedTool} onToolSelect={onToolSelect} />
        )}

        {activeTab === 'zones' && (
          <ZoneServiceControls
            mode="zones"
            selectedZoneType={selectedZoneType}
            onZoneTypeSelect={onZoneTypeSelect}
          />
        )}

        {activeTab === 'services' && (
          <ZoneServiceControls
            mode="services"
            selectedServiceType={selectedServiceType}
            onServiceTypeSelect={onServiceTypeSelect}
          />
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
                <FontAwesomeIcon icon={cityIcons.trash} className="text-sm" />
                <span className="text-sm font-medium">Reset</span>
              </ResponsiveButton>
            )}
          </div>
      </div>
    </ResponsivePanel>
  );
};

export default CityManagementPanel;