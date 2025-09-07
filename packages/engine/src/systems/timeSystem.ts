import { EventEmitter } from 'events';
import type { GameTime, TimeSpeed } from '../types/gameTime';
import { TIME_SPEEDS } from '../types/gameTime';

// Time of day phases
export enum TimeOfDay {
  DAWN = 'dawn',
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
  LATE_NIGHT = 'late_night'
}

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
  private inactivityTimer: number | null = null;
  private autoAcceleration: boolean = false;
  private previousSpeed: TimeSpeed = TIME_SPEEDS.NORMAL;

  // Speed multipliers (real seconds per game minute) - Enhanced for more dynamic gameplay
  private readonly speedMultipliers = {
    [TIME_SPEEDS.PAUSED]: 0,
    [TIME_SPEEDS.NORMAL]: 0.1,       // 0.1 real seconds = 1 game minute (10x speed)
    [TIME_SPEEDS.FAST]: 0.05,        // 0.05 real seconds = 1 game minute (20x speed)
    [TIME_SPEEDS.VERY_FAST]: 0.025,  // 0.025 real seconds = 1 game minute (40x speed)
    [TIME_SPEEDS.ULTRA_FAST]: 0.0125, // 0.0125 real seconds = 1 game minute (80x speed)
    [TIME_SPEEDS.HYPER_SPEED]: 0.005  // 0.005 real seconds = 1 game minute (200x speed)
  };

  // Dynamic speed scaling based on city activity
  private activityMultiplier: number = 1.0;
  private lastActivityCheck: number = 0;

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
    this.setupInactivityDetection();
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
    // Apply dynamic activity-based scaling
    const now = performance.now();
    if (now - this.lastActivityCheck > 5000) { // Check every 5 seconds
      this.updateActivityMultiplier();
      this.lastActivityCheck = now;
    }
    
    const effectiveMultiplier = this.speedMultipliers[this.speed] * this.activityMultiplier;
    const gameMinutesToAdd = deltaTime / effectiveMultiplier;
    
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
    
    // Enhanced time of day determination with smoother transitions
    const hour = this.currentTime.hour;
    const minute = this.currentTime.minute;
    const timeInMinutes = hour * 60 + minute;
    
    const previousTimeOfDay = this.currentTime.timeOfDay;
    
    if (timeInMinutes >= 300 && timeInMinutes < 420) { // 5:00-7:00
      this.currentTime.timeOfDay = 'dawn';
    } else if (timeInMinutes >= 420 && timeInMinutes < 720) { // 7:00-12:00
      this.currentTime.timeOfDay = 'morning';
    } else if (timeInMinutes >= 720 && timeInMinutes < 1020) { // 12:00-17:00
      this.currentTime.timeOfDay = 'afternoon';
    } else if (timeInMinutes >= 1020 && timeInMinutes < 1200) { // 17:00-20:00
      this.currentTime.timeOfDay = 'evening';
    } else if (timeInMinutes >= 1200 && timeInMinutes < 1380) { // 20:00-23:00
      this.currentTime.timeOfDay = 'night';
    } else { // 23:00-5:00
      this.currentTime.timeOfDay = 'late_night';
    }
    
    // Emit time-of-day change event for enhanced visual effects
    if (previousTimeOfDay !== this.currentTime.timeOfDay) {
      this.emit('time-of-day-changed', this.currentTime.timeOfDay as TimeOfDay);
    }
    
    // Calculate season based on month
    const seasonIndex = Math.floor((this.currentTime.month - 1) / 3);
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    this.currentTime.season = seasons[seasonIndex] || 'spring';
    
    // Calculate atmospheric intensity for visual effects
    this.calculateAtmosphericEffects();
  }

  // Calculate atmospheric effects based on time and weather
  private calculateAtmosphericEffects(): void {
    const hour = this.currentTime.hour;
    const minute = this.currentTime.minute;
    
    // Light intensity (0-1)
    let lightIntensity = 1.0;
    if (hour >= 6 && hour <= 18) {
      lightIntensity = 1.0; // Full daylight
    } else if (hour >= 19 && hour <= 21) {
      lightIntensity = 0.7 - ((hour - 19) * 0.2); // Evening fade
    } else if (hour >= 22 || hour <= 5) {
      lightIntensity = 0.3; // Night
    } else {
      lightIntensity = 0.3 + ((hour - 5) * 0.35); // Dawn rise
    }
    
    // Activity level multiplier based on time
    let activityLevel = 1.0;
    if (hour >= 7 && hour <= 9) {
      activityLevel = 1.4; // Morning rush
    } else if (hour >= 12 && hour <= 14) {
      activityLevel = 1.2; // Lunch activity
    } else if (hour >= 17 && hour <= 19) {
      activityLevel = 1.3; // Evening rush
    } else if (hour >= 22 || hour <= 6) {
      activityLevel = 0.6; // Night quiet
    }
    
    // Store atmospheric data for other systems
    (this.currentTime as any).atmosphere = {
      lightIntensity,
      activityLevel,
      temperature: this.calculateTemperature(),
      ambientSound: this.calculateAmbientSound()
    };
  }

  private calculateTemperature(): number {
    const hour = this.currentTime.hour;
    const season = this.currentTime.season;
    
    // Base temperature by season (Celsius)
    const baseTemp = {
      spring: 15,
      summer: 25,
      autumn: 12,
      winter: 2
    }[season] || 15;
    
    // Daily temperature variation
    const dailyVariation = Math.sin((hour - 6) * Math.PI / 12) * 8;
    return baseTemp + dailyVariation;
  }

  private calculateAmbientSound(): string {
    const hour = this.currentTime.hour;
    
    if (hour >= 6 && hour <= 8) return 'morning_birds';
    if (hour >= 9 && hour <= 17) return 'city_bustle';
    if (hour >= 18 && hour <= 20) return 'evening_activity';
    if (hour >= 21 && hour <= 23) return 'night_calm';
    return 'deep_night';
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

  // Update activity multiplier based on city dynamics
  private updateActivityMultiplier(): void {
    // Base activity level - can be enhanced with actual city metrics
    let activityLevel = 1.0;
    
    // Time of day affects activity (more active during day)
    const hour = this.currentTime.hour;
    if (hour >= 6 && hour <= 22) {
      activityLevel *= 1.2; // 20% faster during active hours
    } else {
      activityLevel *= 0.8; // 20% slower during night
    }
    
    // Season affects activity
    if (this.currentTime.season === 'summer' || this.currentTime.season === 'spring') {
      activityLevel *= 1.1; // 10% faster during productive seasons
    }
    
    // Smooth transition to avoid jarring changes
    this.activityMultiplier = this.lerp(this.activityMultiplier, activityLevel, 0.1);
  }

  private lerp(current: number, target: number, factor: number): number {
     return current + (target - current) * factor;
   }

   // Get current activity multiplier for external systems
   getActivityMultiplier(): number {
     return this.activityMultiplier;
   }

  // Setup inactivity detection for auto-acceleration
  private setupInactivityDetection(): void {
    // Only setup inactivity detection in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    let lastActivity = Date.now();
    
    const resetInactivityTimer = () => {
      lastActivity = Date.now();
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      // If auto-acceleration was active, restore previous speed
      if (this.autoAcceleration) {
        this.autoAcceleration = false;
        this.setSpeed(this.previousSpeed);
      }
      
      // Set new inactivity timer (30 seconds)
      this.inactivityTimer = window.setTimeout(() => {
        if (this.speed !== TIME_SPEEDS.PAUSED && this.speed !== TIME_SPEEDS.VERY_FAST) {
          this.autoAcceleration = true;
          this.setSpeed(TIME_SPEEDS.VERY_FAST);
        }
      }, 30000);
    };
    
    // Listen for user activity
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true });
    });
    
    resetInactivityTimer();
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
    return this.speedMultipliers[this.speed];
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
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const timeSystem = new TimeSystem();