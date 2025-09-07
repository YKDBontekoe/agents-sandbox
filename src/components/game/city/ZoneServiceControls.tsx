'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ResponsiveButton, ResponsiveText } from '../hud/ResponsiveHUDPanels';
import { zones, services, type ZoneType, type ServiceType } from './config';

interface ZoneServiceControlsProps {
  mode: 'zones' | 'services';
  selectedZoneType?: ZoneType;
  onZoneTypeSelect?: (zone: ZoneType) => void;
  selectedServiceType?: ServiceType;
  onServiceTypeSelect?: (service: ServiceType) => void;
}

const ZoneServiceControls: React.FC<ZoneServiceControlsProps> = ({
  mode,
  selectedZoneType,
  onZoneTypeSelect,
  selectedServiceType,
  onServiceTypeSelect,
}) => {
  if (mode === 'zones') {
    return (
      <div className="space-y-4">
        <ResponsiveText className="text-lg font-semibold text-white mb-4">
          Zone Types
        </ResponsiveText>
        <div className="space-y-3">
          {zones.map((item) => (
            <div
              key={item.zone}
              className={`p-4 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                selectedZoneType === item.zone
                  ? 'bg-blue-500/20 border-blue-400/50'
                  : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
              }`}
              onClick={() => onZoneTypeSelect?.(item.zone as ZoneType)}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg ${
                    selectedZoneType === item.zone
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-gray-700/50 text-gray-400'
                  }`}
                >
                  <FontAwesomeIcon icon={item.icon} className="text-xl" />
                </div>
                <div>
                  <ResponsiveText
                    className={`font-medium ${
                      selectedZoneType === item.zone ? 'text-blue-400' : 'text-white'
                    }`}
                  >
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
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveText className="text-lg font-semibold text-white mb-4">
        City Services
      </ResponsiveText>
      <div className="grid grid-cols-2 gap-3">
        {services.map((item) => (
          <ResponsiveButton
            key={item.service}
            onClick={() => onServiceTypeSelect?.(item.service as ServiceType)}
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
  );
};

export default ZoneServiceControls;
