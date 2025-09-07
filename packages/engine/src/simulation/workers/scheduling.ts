import type { JobAssignment, WorkerProfile, WorkShift } from './types';

export function generateShifts(buildingType: string, totalWorkers: number): WorkShift[] {
  const shifts: WorkShift[] = [];

  switch (buildingType) {
    case 'farm':
      // Farms work during daylight
      shifts.push({
        startHour: 6,
        endHour: 14,
        workersNeeded: Math.ceil(totalWorkers * 0.7),
        currentWorkers: []
      });
      shifts.push({
        startHour: 14,
        endHour: 18,
        workersNeeded: Math.ceil(totalWorkers * 0.3),
        currentWorkers: []
      });
      break;

    case 'lumber_camp':
      // Lumber camps work early morning
      shifts.push({
        startHour: 5,
        endHour: 13,
        workersNeeded: totalWorkers,
        currentWorkers: []
      });
      break;

    case 'sawmill':
      // Sawmills can work multiple shifts
      shifts.push({
        startHour: 7,
        endHour: 15,
        workersNeeded: Math.ceil(totalWorkers * 0.6),
        currentWorkers: []
      });
      shifts.push({
        startHour: 15,
        endHour: 23,
        workersNeeded: Math.ceil(totalWorkers * 0.4),
        currentWorkers: []
      });
      break;

    default:
      shifts.push({
        startHour: 8,
        endHour: 16,
        workersNeeded: totalWorkers,
        currentWorkers: []
      });
  }

  return shifts;
}

export function findBestShift(worker: WorkerProfile, job: JobAssignment): WorkShift | null {
  const availableShifts = job.shifts.filter(
    shift => shift.currentWorkers.length < shift.workersNeeded
  );

  if (availableShifts.length === 0) return null;

  const scoredShifts = availableShifts.map(shift => {
    let score = 50;

    switch (worker.preferences.preferredShift) {
      case 'morning':
        if (shift.startHour >= 5 && shift.startHour <= 8) score += 30;
        break;
      case 'afternoon':
        if (shift.startHour >= 12 && shift.startHour <= 16) score += 30;
        break;
      case 'evening':
        if (shift.startHour >= 16 && shift.startHour <= 20) score += 30;
        break;
      case 'night':
        if (shift.startHour >= 20 || shift.startHour <= 4) score += 30;
        break;
      case 'flexible':
        score += 10;
        break;
    }

    return { shift, score };
  });

  return scoredShifts.reduce((best, current) =>
    current.score > best.score ? current : best
  ).shift;
}
