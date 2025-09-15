import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameContext } from './GameContext';
import {
  AnimatedCitizen,
  AnimatedVehicle,
  Building,
  Road
} from './citizens/types';
import { generatePath } from './citizens/citizenPathfinding';
import { renderCitizen } from './citizens/CitizenRenderer';
import { renderVehicle } from './citizens/VehicleRenderer';

interface AnimatedCitizensLayerProps {
  buildings: Building[];
  roads: Road[];
  tileTypes: string[][];
  citizensCount: number;
  enableTraffic?: boolean;
}


export default function AnimatedCitizensLayer({
  buildings,
  roads,
  tileTypes,
  citizensCount,
  enableTraffic = true
  }: AnimatedCitizensLayerProps) {
    const { app } = useGameContext();
    const containerRef = useRef<PIXI.Container | null>(null);
    const [citizens, setCitizens] = useState<AnimatedCitizen[]>([]);
    const [vehicles, setVehicles] = useState<AnimatedVehicle[]>([]);
    const isAnimatingRef = useRef<boolean>(false);

  // Initialize citizens based on buildings
  useEffect(() => {
    if (!buildings.length) return;

    const newCitizens: AnimatedCitizen[] = [];
    const newVehicles: AnimatedVehicle[] = [];

    // Create citizens for each building with workers
    buildings.forEach(building => {
      const workerCount = Math.min(building.workers, 3); // Max 3 visible workers per building
      
      for (let i = 0; i < workerCount; i++) {
        const citizen: AnimatedCitizen = {
          id: `${building.id}-worker-${i}`,
          x: building.x,
          y: building.y,
          targetX: building.x,
          targetY: building.y,
          speed: 0.015 + Math.random() * 0.01,
          type: 'worker',
          buildingId: building.id,
          lastActivity: Date.now() + Math.random() * 5000,
          direction: Math.random() * Math.PI * 2
        };
        newCitizens.push(citizen);
      }
    });

    // Create some roaming citizens
    const roamingCount = Math.min(citizensCount, 15);
    for (let i = 0; i < roamingCount; i++) {
      const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
      const citizen: AnimatedCitizen = {
        id: `roaming-${i}`,
        x: randomBuilding.x,
        y: randomBuilding.y,
        targetX: randomBuilding.x,
        targetY: randomBuilding.y,
        speed: 0.01 + Math.random() * 0.015,
        type: Math.random() > 0.7 ? 'trader' : 'citizen',
        lastActivity: Date.now() + Math.random() * 8000,
        direction: Math.random() * Math.PI * 2
      };
      newCitizens.push(citizen);
    }

    // Create vehicles for trade buildings
    if (enableTraffic) {
      buildings.filter(b => b.typeId === 'trade_post' || b.typeId === 'storehouse').forEach((building, index) => {
        const vehicle: AnimatedVehicle = {
          id: `vehicle-${building.id}`,
          x: building.x,
          y: building.y,
          targetX: building.x,
          targetY: building.y,
          speed: 0.02 + Math.random() * 0.015,
          type: index % 3 === 0 ? 'cart' : index % 3 === 1 ? 'wagon' : 'boat',
          cargo: ['wood', 'stone', 'food', 'goods', 'tools'][Math.floor(Math.random() * 5)],
          lastDelivery: Date.now() + Math.random() * 10000,
          direction: Math.random() * Math.PI * 2
        };
        newVehicles.push(vehicle);
      });
    }

    setCitizens(newCitizens);
    setVehicles(newVehicles);
  }, [buildings, citizensCount, enableTraffic]);

  // Create PIXI container and sprites
  useEffect(() => {
    if (!app) return;

    const container = new PIXI.Container();
    containerRef.current = container;
    app.stage.addChild(container);

    return () => {
      if (containerRef.current) {
        app.stage.removeChild(containerRef.current);
        containerRef.current.destroy();
      }
    };
  }, [app]);

  // Optimized animation loop with sprite pooling
  useEffect(() => {
    if (!containerRef.current || !app) return;

    const container = containerRef.current;
    let animationId: number;
    const spritePool = new Map<string, PIXI.Graphics>();
    const activeSprites = new Set<string>();
    
    const animate = () => {
      activeSprites.clear();

      // Update citizen sprites (reuse existing sprites)
      citizens.forEach(citizen => {
        const spriteId = `citizen-${citizen.id}`;
        activeSprites.add(spriteId);
        
        let sprite = spritePool.get(spriteId);
        if (!sprite) {
          sprite = renderCitizen(citizen);
          if (sprite) {
            spritePool.set(spriteId, sprite);
            container.addChild(sprite);
          }
        } else {
          // Update position and properties without recreating
          sprite.x = citizen.x;
          sprite.y = citizen.y;
          sprite.visible = true;
        }
      });

      // Update vehicle sprites (reuse existing sprites)
      if (enableTraffic) {
        vehicles.forEach(vehicle => {
          const spriteId = `vehicle-${vehicle.id}`;
          activeSprites.add(spriteId);
          
          let sprite = spritePool.get(spriteId);
          if (!sprite) {
            sprite = renderVehicle(vehicle);
            if (sprite) {
              spritePool.set(spriteId, sprite);
              container.addChild(sprite);
            }
          } else {
            // Update position and properties without recreating
            sprite.x = vehicle.x;
            sprite.y = vehicle.y;
            sprite.visible = true;
          }
        });
      }

      // Hide unused sprites instead of destroying them
      spritePool.forEach((sprite, spriteId) => {
        if (!activeSprites.has(spriteId)) {
          sprite.visible = false;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      // Clean up sprite pool
      spritePool.forEach(sprite => {
        if (sprite.parent) {
          sprite.parent.removeChild(sprite);
        }
        sprite.destroy();
      });
      spritePool.clear();
    };
  }, [citizens, vehicles, enableTraffic]);

  return null;
}