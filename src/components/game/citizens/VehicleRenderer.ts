import * as PIXI from 'pixi.js';
import { AnimatedVehicle } from './types';
import { gridToIso } from './citizenPathfinding';

export function renderVehicle(vehicle: AnimatedVehicle): PIXI.Graphics {
  const isoPos = gridToIso(vehicle.x, vehicle.y);
  const sprite = new PIXI.Graphics();

  if (vehicle.direction !== undefined) {
    sprite.rotation = vehicle.direction;
  }

  if (vehicle.type === 'cart') {
    sprite.beginFill(0x8B4513);
    sprite.drawRect(-6, -3, 12, 6);
    sprite.beginFill(0xA0522D);
    sprite.drawRect(4, -2, 2, 4);
  } else if (vehicle.type === 'wagon') {
    sprite.beginFill(0x654321);
    sprite.drawRect(-8, -4, 16, 8);
    sprite.beginFill(0x8B4513);
    sprite.drawRect(6, -3, 2, 6);
  } else {
    sprite.beginFill(0x4169E1);
    sprite.drawEllipse(0, 0, 10, 5);
    sprite.beginFill(0x6495ED);
    sprite.drawEllipse(6, 0, 4, 2);
  }
  sprite.endFill();

  if (vehicle.cargo) {
    let cargoColor = 0xFFD700;
    switch (vehicle.cargo) {
      case 'wood': cargoColor = 0x8B4513; break;
      case 'stone': cargoColor = 0x708090; break;
      case 'food': cargoColor = 0x32CD32; break;
      case 'goods': cargoColor = 0xFF6347; break;
      case 'tools': cargoColor = 0x4682B4; break;
    }
    sprite.beginFill(cargoColor, 0.8);
    sprite.drawCircle(-2, -2, 3);
    sprite.endFill();
  }

  if (vehicle.path && vehicle.pathIndex !== undefined) {
    sprite.beginFill(0x00FF00, 0.3);
    sprite.drawCircle(0, -8, 2);
    sprite.endFill();
  }

  sprite.position.set(isoPos.x, isoPos.y);
  return sprite;
}
