'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ResponsiveButton, ResponsiveText } from '../hud/ResponsiveHUDPanels';
import { tools, type ManagementTool } from './config';

interface ToolSelectorProps {
  selectedTool: ManagementTool;
  onToolSelect: (tool: ManagementTool) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ selectedTool, onToolSelect }) => (
  <div className="space-y-4">
    <ResponsiveText className="text-lg font-semibold text-white mb-4">
      Management Tools
    </ResponsiveText>
    <div className="grid grid-cols-2 gap-3">
      {tools.map((item) => (
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
);

export default ToolSelector;
