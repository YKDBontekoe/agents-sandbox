'use client';

import React, { useState, useEffect } from 'react';
import { TIME_SPEEDS, TimeOfDay, type GameTime, type TimeSpeed, type TimeSystem } from '@engine';
import { faPlay, faPause, faForward, faClock, faSun, faMoon, faCloudSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface TimeControlPanelProps {
  className?: string;
  timeSystem: TimeSystem;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: TimeSpeed) => void;
}

export const TimeControlPanel: React.FC<TimeControlPanelProps> = ({
  className = '',
  timeSystem,
  onPause,
  onResume,
  onSetSpeed,
}) => {
  const [currentTime, setCurrentTime] = useState<GameTime>(timeSystem.getCurrentTime());
  const [currentSpeed, setCurrentSpeed] = useState<TimeSpeed>(timeSystem.getCurrentSpeed());
  const [isPaused, setIsPaused] = useState<boolean>(timeSystem.isPaused());

  useEffect(() => {
    // Sync with the latest time system snapshot
    setCurrentTime(timeSystem.getCurrentTime());
    setCurrentSpeed(timeSystem.getCurrentSpeed());
    setIsPaused(timeSystem.isPaused());

    // Listen for time updates
    const handleTimeUpdate = (time: GameTime) => {
      setCurrentTime(time);
    };

    const handleSpeedChange = (speed: TimeSpeed) => {
      setCurrentSpeed(speed);
      setIsPaused(speed === TIME_SPEEDS.PAUSED);
    };

    const handlePauseToggle = (paused: boolean) => {
      setIsPaused(paused);
    };

    timeSystem.on('time-updated', handleTimeUpdate);
    timeSystem.on('speed-changed', handleSpeedChange);
    timeSystem.on('pause-toggled', handlePauseToggle);

    return () => {
      timeSystem.off('time-updated', handleTimeUpdate);
      timeSystem.off('speed-changed', handleSpeedChange);
      timeSystem.off('pause-toggled', handlePauseToggle);
    };
  }, [timeSystem]);

  // Get time of day icon
  const getTimeOfDayIcon = (timeOfDay: string) => {
    switch (timeOfDay.toUpperCase()) {
      case 'DAWN':
      case 'MORNING':
        return faSun;
      case 'AFTERNOON':
        return faSun;
      case 'EVENING':
        return faCloudSun;
      case 'NIGHT':
      case 'LATE_NIGHT':
        return faMoon;
      default:
        return faSun;
    }
  };

  // Get time of day color
  const getTimeOfDayColor = (timeOfDay: string) => {
    switch (timeOfDay.toUpperCase()) {
      case 'DAWN':
        return 'text-pink-400';
      case 'MORNING':
        return 'text-yellow-400';
      case 'AFTERNOON':
        return 'text-yellow-500';
      case 'EVENING':
        return 'text-orange-500';
      case 'NIGHT':
        return 'text-blue-400';
      case 'LATE_NIGHT':
        return 'text-indigo-400';
      default:
        return 'text-yellow-400';
    }
  };

  // Get speed button style
  const getSpeedButtonStyle = (speed: TimeSpeed) => {
    const isActive = currentSpeed === speed;
    const baseStyle = 'px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 border';
    
    if (isActive) {
      return `${baseStyle} bg-blue-600 text-white border-blue-600 shadow-md`;
    }
    return `${baseStyle} bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white`;
  };

  // Handle speed change
  const handleSpeedChange = (speed: TimeSpeed) => {
    onSetSpeed(speed);
  };

  // Handle pause toggle
  const handlePauseToggle = () => {
    if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  // Calculate day progress for visual indicator
  const dayProgressDegrees = currentTime.dayProgress * 360;

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg ${className}`}>
      {/* Time Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FontAwesomeIcon 
            icon={faClock} 
            className="text-gray-400 text-lg"
          />
          <div>
            <div className="text-white font-mono text-lg">
              {timeSystem.getFormattedTime()}
            </div>
            <div className="text-gray-400 text-xs">
              {timeSystem.getFormattedDate()}
            </div>
          </div>
        </div>
        
        {/* Day/Night Indicator */}
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon 
            icon={getTimeOfDayIcon(currentTime.timeOfDay)} 
            className={`text-lg ${getTimeOfDayColor(currentTime.timeOfDay)}`}
          />
          <span className="text-gray-300 text-sm capitalize">
            {currentTime.timeOfDay.toString().replace('_', ' ').toLowerCase()}
          </span>
        </div>
      </div>

      {/* Day Progress Circle */}
      <div className="flex justify-center mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#374151"
              strokeWidth="4"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={getTimeOfDayColor(currentTime.timeOfDay).replace('text-', '')}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - currentTime.dayProgress)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon 
              icon={getTimeOfDayIcon(currentTime.timeOfDay)} 
              className={`text-sm ${getTimeOfDayColor(currentTime.timeOfDay)}`}
            />
          </div>
        </div>
      </div>

      {/* Speed Controls */}
      <div className="space-y-3">
        {/* Pause/Play Button */}
        <button
          onClick={handlePauseToggle}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-all duration-200 ${
            isPaused 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          <FontAwesomeIcon icon={isPaused ? faPlay : faPause} />
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        {/* Speed Buttons */}
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => handleSpeedChange(TIME_SPEEDS.NORMAL)}
            className={getSpeedButtonStyle(TIME_SPEEDS.NORMAL)}
            disabled={isPaused}
          >
            5x
          </button>
          <button
            onClick={() => handleSpeedChange(TIME_SPEEDS.FAST)}
            className={getSpeedButtonStyle(TIME_SPEEDS.FAST)}
            disabled={isPaused}
          >
            10x
          </button>
          <button
            onClick={() => handleSpeedChange(TIME_SPEEDS.VERY_FAST)}
            className={getSpeedButtonStyle(TIME_SPEEDS.VERY_FAST)}
            disabled={isPaused}
          >
            20x
          </button>
          <button
            onClick={() => handleSpeedChange(TIME_SPEEDS.ULTRA_FAST)}
            className={getSpeedButtonStyle(TIME_SPEEDS.ULTRA_FAST)}
            disabled={isPaused}
          >
            40x
          </button>
          <button
            onClick={() => handleSpeedChange(TIME_SPEEDS.HYPER_SPEED)}
            className={getSpeedButtonStyle(TIME_SPEEDS.HYPER_SPEED)}
            disabled={isPaused}
          >
            100x
          </button>
        </div>

        {/* Speed Indicator */}
        <div className="text-center">
          <div className="text-gray-400 text-xs mb-1">Current Speed</div>
          <div className="flex items-center justify-center space-x-1">
            {isPaused ? (
              <span className="text-red-400 font-medium">PAUSED</span>
            ) : (
              <>
                <FontAwesomeIcon icon={faForward} className="text-blue-400" />
                <span className="text-blue-400 font-medium">
                  {currentSpeed === TIME_SPEEDS.NORMAL ? '5x' :
                   currentSpeed === TIME_SPEEDS.FAST ? '10x' :
                   currentSpeed === TIME_SPEEDS.VERY_FAST ? '20x' :
                   currentSpeed === TIME_SPEEDS.ULTRA_FAST ? '40x' :
                   currentSpeed === TIME_SPEEDS.HYPER_SPEED ? '100x' : '5x'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Auto-acceleration Notice */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Auto-acceleration after 30s of inactivity
      </div>
    </div>
  );
};

export default TimeControlPanel;