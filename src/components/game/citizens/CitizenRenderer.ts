import * as PIXI from 'pixi.js';
import { AnimatedCitizen } from './types';
import { gridToIso } from './citizenPathfinding';

export function renderCitizen(citizen: AnimatedCitizen): PIXI.Graphics {
  const isoPos = gridToIso(citizen.x, citizen.y);
  const sprite = new PIXI.Graphics();

  if (citizen.direction !== undefined) {
    sprite.rotation = citizen.direction;
  }

  let baseColor = 0x7ED321; // Default green for citizens
  if (citizen.type === 'worker') {
    baseColor = 0x4A90E2; // Blue for workers
  } else if (citizen.type === 'trader') {
    baseColor = 0xF5A623; // Orange for traders
  }

  sprite.beginFill(baseColor);
  sprite.drawCircle(0, 0, 3);

  sprite.beginFill(baseColor, 0.7);
  sprite.drawCircle(2, 0, 1.5);
  sprite.endFill();

  if (citizen.lastActivity) {
    const timeSinceActivity = Date.now() - citizen.lastActivity;
    const activityIntensity = Math.max(0, 1 - timeSinceActivity / 5000);

    let activityColor = 0xFFFFFF;
    if (citizen.type === 'worker') {
      activityColor = 0xFFA500;
    } else if (citizen.type === 'trader') {
      activityColor = 0x32CD32;
    } else {
      activityColor = 0x87CEEB;
    }

    sprite.beginFill(activityColor, activityIntensity * 0.6);
    sprite.drawCircle(-1, -4, 1.5);
    sprite.endFill();
  }

  if (citizen.path && citizen.pathIndex !== undefined) {
    sprite.beginFill(0x00FF00, 0.4);
    sprite.drawCircle(0, -6, 1.5);
    sprite.endFill();
  }

  sprite.position.set(isoPos.x, isoPos.y);
  return sprite;
}
