import { EventEmitter } from 'events';
import type { GameTime, TimeSpeed } from '../../types/gameTime';
import { TIME_SPEEDS } from '../../types/gameTime';
import { TimeOfDay, SPEED_MULTIPLIERS } from './constants';

// Time system events
export interface TimeSystemEvents {
  'time-updated': (gameTime: GameTime) => void;
  'speed-changed': (speed: TimeSpeed) => void;
  'day-changed': (day: number) => void;
  'time-of-day-changed': (timeOfDay: TimeOfDay) => void;
  'pause-toggled': (isPaused: boolean) => void;
}

// Cities: Skylines-style time management system
export class TimeSystem extends EventEmitter {
  private currentTime: GameTime;
  private speed: TimeSpeed = TIME_SPEEDS.NORMAL;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private previousSpeed: TimeSpeed = TIME_SPEEDS.NORMAL;

  constructor(startTime?: Partial<GameTime>) {
    super();
    
    // Initialize with default or provided time
    this.currentTime = {
      year: 2024,
      month: 1,
      day: 1,
      hour: 8,
      minute: 0,
      totalMinutes: 0,
      timeOfDay: 'morning',
      dayProgress: 0,
      season: 'spring',
      ...startTime
    };
    this.updateDerivedValues();
  }

  // Start the time system
  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.tick();
  }

  // Stop the time system
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // Main update loop
  private tick(): void {
    if (!this.isRunning || typeof window === 'undefined') return;

    const now = performance.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;

    if (this.speed !== TIME_SPEEDS.PAUSED) {
      this.updateTime(deltaTime);
    }

    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }

  // Update game time based on real time and speed multiplier
  private updateTime(deltaTime: number): void {
    const gameMinutesToAdd = deltaTime / SPEED_MULTIPLIERS[this.speed];
    
    const previousDay = this.currentTime.day;
    const previousTimeOfDay = this.currentTime.timeOfDay;
    
    // Add minutes to current time
    this.currentTime.totalMinutes += gameMinutesToAdd;
    this.currentTime.minute += gameMinutesToAdd;
    
    // Handle minute overflow
    if (this.currentTime.minute >= 60) {
      const hoursToAdd = Math.floor(this.currentTime.minute / 60);
      this.currentTime.minute = this.currentTime.minute % 60;
      this.currentTime.hour += hoursToAdd;
      
      // Handle hour overflow
      if (this.currentTime.hour >= 24) {
        const daysToAdd = Math.floor(this.currentTime.hour / 24);
        this.currentTime.hour = this.currentTime.hour % 24;
        this.currentTime.day += daysToAdd;
        
        // Handle day overflow (simple 30-day months)
        if (this.currentTime.day > 30) {
          const monthsToAdd = Math.floor((this.currentTime.day - 1) / 30);
          this.currentTime.day = ((this.currentTime.day - 1) % 30) + 1;
          this.currentTime.month += monthsToAdd;
          
          // Handle month overflow
          if (this.currentTime.month > 12) {
            const yearsToAdd = Math.floor((this.currentTime.month - 1) / 12);
            this.currentTime.month = ((this.currentTime.month - 1) % 12) + 1;
            this.currentTime.year += yearsToAdd;
          }
        }
      }
    }
    
    this.updateDerivedValues();
    
    // Emit events for changes
    this.emit('time-updated', this.currentTime);
    
    if (previousDay !== this.currentTime.day) {
      this.emit('day-changed', this.currentTime.day);
    }
    
    if (previousTimeOfDay !== this.currentTime.timeOfDay) {
      this.emit('time-of-day-changed', this.currentTime.timeOfDay);
    }
  }

  // Update derived values like time of day and day progress
  private updateDerivedValues(): void {
    const totalMinutesInDay = this.currentTime.hour * 60 + this.currentTime.minute;
    this.currentTime.dayProgress = totalMinutesInDay / (24 * 60);
    
    const timeInMinutes = this.currentTime.hour * 60 + this.currentTime.minute;
    const previousTimeOfDay = this.currentTime.timeOfDay;

    if (timeInMinutes >= 300 && timeInMinutes < 420) {
      this.currentTime.timeOfDay = 'dawn';
    } else if (timeInMinutes >= 420 && timeInMinutes < 720) {
      this.currentTime.timeOfDay = 'morning';
    } else if (timeInMinutes >= 720 && timeInMinutes < 1020) {
      this.currentTime.timeOfDay = 'afternoon';
    } else if (timeInMinutes >= 1020 && timeInMinutes < 1200) {
      this.currentTime.timeOfDay = 'evening';
    } else if (timeInMinutes >= 1200 && timeInMinutes < 1380) {
      this.currentTime.timeOfDay = 'night';
    } else {
      this.currentTime.timeOfDay = 'late_night';
    }

    if (previousTimeOfDay !== this.currentTime.timeOfDay) {
      this.emit('time-of-day-changed', this.currentTime.timeOfDay as TimeOfDay);
    }

    const seasonIndex = Math.floor((this.currentTime.month - 1) / 3);
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    this.currentTime.season = seasons[seasonIndex] || 'spring';
  }

  // Set time speed
  setSpeed(speed: TimeSpeed): void {
    if (speed !== this.speed) {
      this.previousSpeed = this.speed;
      this.speed = speed;
      this.emit('speed-changed', speed);
    }
  }

  // Toggle pause
  togglePause(): void {
    if (this.speed === TIME_SPEEDS.PAUSED) {
      this.setSpeed(this.previousSpeed);
    } else {
      this.setSpeed(TIME_SPEEDS.PAUSED);
    }
    this.emit('pause-toggled', this.speed === TIME_SPEEDS.PAUSED);
  }

  // Cycle through speed settings
  cycleSpeed(): void {
    const speeds = [TIME_SPEEDS.NORMAL, TIME_SPEEDS.FAST, TIME_SPEEDS.VERY_FAST, TIME_SPEEDS.ULTRA_FAST, TIME_SPEEDS.HYPER_SPEED] as const;
    let currentIndex = speeds.findIndex(s => s === this.speed);
    if (currentIndex === -1) currentIndex = 0; // Default to NORMAL if current speed not found
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.setSpeed(speeds[nextIndex]);
  }

  // Getters
  getCurrentTime(): GameTime {
    return { ...this.currentTime };
  }

  getCurrentSpeed(): TimeSpeed {
    return this.speed;
  }

  isPaused(): boolean {
    return this.speed === TIME_SPEEDS.PAUSED;
  }

  getSpeedMultiplier(): number {
    return SPEED_MULTIPLIERS[this.speed];
  }

  // Setters
  setTime(time: Partial<GameTime>): void {
    this.currentTime = { ...this.currentTime, ...time };
    this.updateDerivedValues();
    this.emit('time-updated', this.currentTime);
  }

  // Utility methods
  getFormattedTime(): string {
    const { hour, minute } = this.currentTime;
    return `${hour.toString().padStart(2, '0')}:${Math.floor(minute).toString().padStart(2, '0')}`;
  }

  getFormattedDate(): string {
    const { year, month, day } = this.currentTime;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const timeSystem = new TimeSystem();
