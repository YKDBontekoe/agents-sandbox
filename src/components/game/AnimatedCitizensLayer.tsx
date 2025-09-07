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
    const [, setCitizens] = useState<AnimatedCitizen[]>([]);
    const [, setVehicles] = useState<AnimatedVehicle[]>([]);
    const animationRef = useRef<number>(0);

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

  // Animation loop
  useEffect(() => {
    if (!containerRef.current || !app) return;

    const container = containerRef.current;
    
    const animate = () => {
      // Clear previous sprites
      container.removeChildren();

      // Animate citizens
      setCitizens(prevCitizens => {
        return prevCitizens.map(citizen => {
          const newCitizen = { ...citizen };
          const currentTime = Date.now();

          // Check if following a path
          if (citizen.path && citizen.pathIndex !== undefined) {
            const currentTarget = citizen.path[citizen.pathIndex];
            if (currentTarget) {
              const distanceToWaypoint = Math.sqrt(
                Math.pow(currentTarget.x - citizen.x, 2) + Math.pow(currentTarget.y - citizen.y, 2)
              );

              if (distanceToWaypoint < 0.2) {
                // Move to next waypoint
                newCitizen.pathIndex = (citizen.pathIndex + 1) % citizen.path.length;
                if (newCitizen.pathIndex === 0) {
                  // Completed path, clear it
                  newCitizen.path = undefined;
                  newCitizen.pathIndex = undefined;
                  newCitizen.lastActivity = currentTime;
                }
              } else {
                // Move towards current waypoint
                const dx = currentTarget.x - citizen.x;
                const dy = currentTarget.y - citizen.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                  newCitizen.x += (dx / distance) * citizen.speed;
                  newCitizen.y += (dy / distance) * citizen.speed;
                  newCitizen.direction = Math.atan2(dy, dx);
                }
              }
            }
          } else {
            // Check if it's time for new activity
            const timeSinceLastActivity = currentTime - (citizen.lastActivity || 0);
            const activityInterval = citizen.type === 'worker' ? 8000 : 12000; // Workers more active

            if (timeSinceLastActivity > activityInterval) {
              // Choose new target and generate path
              let targetBuilding;
              
              if (citizen.type === 'worker' && citizen.buildingId) {
                // Workers move around their building or to nearby buildings
                const building = buildings.find(b => b.id === citizen.buildingId);
                if (building) {
                  const nearbyBuildings = buildings.filter(b => 
                    Math.abs(b.x - building.x) <= 4 && Math.abs(b.y - building.y) <= 4
                  );
                  targetBuilding = nearbyBuildings[Math.floor(Math.random() * nearbyBuildings.length)] || building;
                }
              } else if (citizen.type === 'trader') {
                // Traders prefer trade buildings
                const tradeBuildings = buildings.filter(b => 
                  b.typeId === 'trade_post' || b.typeId === 'storehouse' || b.typeId === 'market'
                );
                targetBuilding = tradeBuildings.length > 0 
                  ? tradeBuildings[Math.floor(Math.random() * tradeBuildings.length)]
                  : buildings[Math.floor(Math.random() * buildings.length)];
              } else {
                // Regular citizens move between various buildings
                targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
              }

              if (targetBuilding) {
                const targetX = targetBuilding.x + (Math.random() - 0.5) * 1.5;
                const targetY = targetBuilding.y + (Math.random() - 0.5) * 1.5;
                
                // Generate path using A* algorithm
                const path = generatePath(citizen.x, citizen.y, targetX, targetY, roads, tileTypes);
                if (path.length > 1) {
                  newCitizen.path = path;
                  newCitizen.pathIndex = 1; // Skip first point (current position)
                  newCitizen.targetX = targetX;
                  newCitizen.targetY = targetY;
                }
              }
            }
          }

          const sprite = renderCitizen(newCitizen);
          container.addChild(sprite);

          return newCitizen;
        });
      });

      // Animate vehicles
      setVehicles(prevVehicles => {
        return prevVehicles.map(vehicle => {
          const newVehicle = { ...vehicle };
          const currentTime = Date.now();

          // Check if following a path
          if (vehicle.path && vehicle.pathIndex !== undefined) {
            const currentTarget = vehicle.path[vehicle.pathIndex];
            if (currentTarget) {
              const distanceToWaypoint = Math.sqrt(
                Math.pow(currentTarget.x - vehicle.x, 2) + Math.pow(currentTarget.y - vehicle.y, 2)
              );

              if (distanceToWaypoint < 0.3) {
                // Move to next waypoint
                newVehicle.pathIndex = (vehicle.pathIndex + 1) % vehicle.path.length;
                if (newVehicle.pathIndex === 0) {
                  // Completed delivery route, clear path and update cargo
                  newVehicle.path = undefined;
                  newVehicle.pathIndex = undefined;
                  newVehicle.lastDelivery = currentTime;
                  // Change cargo after delivery
                  newVehicle.cargo = ['wood', 'stone', 'food', 'goods', 'tools'][Math.floor(Math.random() * 5)];
                }
              } else {
                // Move towards current waypoint
                const dx = currentTarget.x - vehicle.x;
                const dy = currentTarget.y - vehicle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                  newVehicle.x += (dx / distance) * vehicle.speed;
                  newVehicle.y += (dy / distance) * vehicle.speed;
                  newVehicle.direction = Math.atan2(dy, dx);
                }
              }
            }
          } else {
            // Check if it's time for new delivery
            const timeSinceLastDelivery = currentTime - (vehicle.lastDelivery || 0);
            const deliveryInterval = 15000 + Math.random() * 10000; // 15-25 seconds

            if (timeSinceLastDelivery > deliveryInterval) {
              // Choose delivery route between trade buildings
              const tradeBuildings = buildings.filter(b => 
                b.typeId === 'trade_post' || b.typeId === 'storehouse' || b.typeId === 'market'
              );
              
              if (tradeBuildings.length > 1) {
                // Find different building than current location
                const availableTargets = tradeBuildings.filter(b => 
                  Math.abs(b.x - vehicle.x) > 2 || Math.abs(b.y - vehicle.y) > 2
                );
                
                if (availableTargets.length > 0) {
                  const target = availableTargets[Math.floor(Math.random() * availableTargets.length)];
                  
                  // Generate delivery path using A* algorithm
                  const path = generatePath(vehicle.x, vehicle.y, target.x, target.y, roads, tileTypes);
                  if (path.length > 1) {
                    newVehicle.path = path;
                    newVehicle.pathIndex = 1; // Skip first point (current position)
                    newVehicle.targetX = target.x;
                    newVehicle.targetY = target.y;
                  }
                }
              }
            }
          }

          const sprite = renderVehicle(newVehicle);
          container.addChild(sprite);

          return newVehicle;
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [app, buildings, roads, tileTypes]);

  return null;
}