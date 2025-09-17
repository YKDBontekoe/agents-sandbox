import type { PathfindingGoal } from './ai/types';
import type { Citizen } from './citizens/citizen';

export interface PlannedActivity {
  activity: string;
}

export function planActivityForGoal(citizen: Citizen, goal: PathfindingGoal): PlannedActivity {
  const activity = convertGoalToActivity(goal);
  updateCitizenMovement(citizen, goal);
  return { activity };
}

function convertGoalToActivity(goal: PathfindingGoal): string {
  switch (goal.purpose) {
    case 'work':
      return 'working';
    case 'home':
      return 'resting';
    case 'social':
      return 'socializing';
    case 'resource':
      return 'seeking_food';
    case 'explore':
      return 'exploring';
    case 'emergency':
      return 'seeking_shelter';
    default:
      return 'idle';
  }
}

function updateCitizenMovement(citizen: Citizen, goal: PathfindingGoal): void {
  const currentPos = citizen.location;
  const targetPos = goal.target;

  const distance = Math.hypot(targetPos.x - currentPos.x, targetPos.y - currentPos.y);

  if (distance <= 1) {
    return;
  }

  const baseSpeed = 0.5;
  const urgencyMultiplier = 1 + goal.urgency / 100;
  const energyMultiplier = citizen.mood.energy / 100;
  const speed = baseSpeed * urgencyMultiplier * energyMultiplier;

  const dirX = (targetPos.x - currentPos.x) / distance;
  const dirY = (targetPos.y - currentPos.y) / distance;

  const randomFactor = 0.1;
  const randomX = (Math.random() - 0.5) * randomFactor;
  const randomY = (Math.random() - 0.5) * randomFactor;

  citizen.location = {
    x: currentPos.x + (dirX + randomX) * speed,
    y: currentPos.y + (dirY + randomY) * speed,
  };

  if (distance < 0.1 && goal.alternatives.length > 0) {
    const alternative = goal.alternatives[0];
    goal.target = { x: alternative.x, y: alternative.y };
  }
}
