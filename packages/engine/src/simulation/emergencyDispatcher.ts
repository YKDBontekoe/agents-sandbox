import { ServiceType, type EmergencyEvent, type Position } from './cityServices.types';

export type EmergencyDispatcherConfig = {
  gridWidth: number;
  gridHeight: number;
  randomEventChance?: number;
  severityDurationMultiplier?: number;
  responseTimeBounds?: { min: number; max: number };
  coverageEffectivenessMultiplier?: number;
};

const DEFAULT_EVENT_TYPES: EmergencyEvent['type'][] = ['fire', 'crime', 'medical', 'accident'];

export class EmergencyDispatcher {
  private events: EmergencyEvent[] = [];

  constructor(
    private readonly coverageLookup: (position: Position, serviceType: ServiceType) => number,
    private readonly config: EmergencyDispatcherConfig,
    private readonly random: () => number = Math.random
  ) {}

  spawnEmergencyEvent(type: EmergencyEvent['type'], position: Position, severity: number): EmergencyEvent {
    const idFragment = this.random().toString(36).slice(2, 11) || Date.now().toString(36);
    const event: EmergencyEvent = {
      id: `emergency_${Date.now()}_${idFragment}`,
      type,
      position,
      severity,
      startTime: Date.now(),
      duration: severity * (this.config.severityDurationMultiplier ?? 30000),
      resolved: false
    };

    this.events.push(event);
    this.respondToEmergency(event);
    return event;
  }

  update(deltaTime?: number): void {
    void deltaTime;
    this.cleanupResolvedEvents();
    this.maybeSpawnRandomEvent();
  }

  getActiveEmergencies(): EmergencyEvent[] {
    return this.events.filter(event => !event.resolved);
  }

  private cleanupResolvedEvents(): void {
    const now = Date.now();
    this.events = this.events.filter(event => {
      if (event.resolved) {
        return false;
      }
      if (now - event.startTime > event.duration) {
        return false;
      }
      return true;
    });
  }

  private maybeSpawnRandomEvent(): void {
    const chance = this.config.randomEventChance ?? 0.001;
    if (this.random() >= chance) {
      return;
    }

    const type = DEFAULT_EVENT_TYPES[Math.floor(this.random() * DEFAULT_EVENT_TYPES.length)];
    const position: Position = {
      x: this.random() * this.config.gridWidth,
      y: this.random() * this.config.gridHeight
    };
    const severity = Math.floor(this.random() * 5) + 1;

    this.spawnEmergencyEvent(type, position, severity);
  }

  private respondToEmergency(event: EmergencyEvent): void {
    const serviceType = this.getServiceTypeForEmergency(event.type);
    const coverage = this.coverageLookup(event.position, serviceType);

    const bounds = this.config.responseTimeBounds ?? { min: 1000, max: 10000 };
    const coverageEffect = this.config.coverageEffectivenessMultiplier ?? 1.2;

    const responseRange = Math.max(bounds.max - bounds.min, 0);
    const responseTime = Math.max(bounds.min, bounds.max - coverage * responseRange);
    const effectiveness = Math.min(1, coverage * coverageEffect);

    setTimeout(() => {
      event.resolved = true;
      event.duration = Math.floor(event.duration * (1 - effectiveness));
    }, responseTime);
  }

  private getServiceTypeForEmergency(emergencyType: EmergencyEvent['type']): ServiceType {
    switch (emergencyType) {
      case 'fire':
        return ServiceType.FIRE;
      case 'crime':
        return ServiceType.POLICE;
      case 'medical':
        return ServiceType.HEALTHCARE;
      case 'accident':
      default:
        return ServiceType.POLICE;
    }
  }
}
