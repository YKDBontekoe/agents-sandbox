import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameContext } from './GameContext';

interface AnimatedCitizen {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'worker' | 'trader' | 'citizen';
  buildingId?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  lastActivity?: number;
  direction?: number;
}

interface AnimatedVehicle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  type: 'cart' | 'wagon' | 'boat';
  cargo?: string;
  path?: { x: number; y: number }[];
  pathIndex?: number;
  direction?: number;
  lastDelivery?: number;
}

interface Building {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers: number;
  level: number;
}

interface Road {
  x: number;
  y: number;
}

interface AnimatedCitizensLayerProps {
  buildings: Building[];
  roads: Road[];
  tileTypes: string[][];
  citizensCount: number;
  enableTraffic?: boolean;
}

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;

// Convert grid coordinates to isometric screen coordinates
function gridToIso(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2)
  };
}

// Generate pathfinding between two points
// A* pathfinding implementation
function generatePath(startX: number, startY: number, endX: number, endY: number, roads: Road[], tileTypes: string[][]): { x: number; y: number }[] {
  const roadSet = new Set(roads.map(r => `${r.x},${r.y}`));
  const maxX = tileTypes[0]?.length || 20;
  const maxY = tileTypes.length || 20;
  
  // Node for A* algorithm
  interface PathNode {
    x: number;
    y: number;
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent?: PathNode;
  }
  
  const heuristic = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  };
  
  const getMoveCost = (x: number, y: number) => {
    // Prefer roads for movement
    if (roadSet.has(`${x},${y}`)) return 1;
    // Higher cost for non-road tiles
    if (x >= 0 && x < maxX && y >= 0 && y < maxY) {
      const tileType = tileTypes[y]?.[x];
      if (tileType === 'water') return 10; // Avoid water
      if (tileType === 'mountain') return 8; // Difficult terrain
      return 3; // Regular terrain
    }
    return 5; // Unknown terrain
  };
  
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    x: Math.round(startX),
    y: Math.round(startY),
    g: 0,
    h: heuristic(Math.round(startX), Math.round(startY), Math.round(endX), Math.round(endY)),
    f: 0
  };
  startNode.f = startNode.g + startNode.h;
  
  openSet.push(startNode);
  
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  while (openSet.length > 0) {
    // Find node with lowest f cost
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIndex].f) {
        currentIndex = i;
      }
    }
    
    const current = openSet.splice(currentIndex, 1)[0];
    closedSet.add(`${current.x},${current.y}`);
    
    // Check if we reached the goal
    if (Math.abs(current.x - Math.round(endX)) <= 1 && Math.abs(current.y - Math.round(endY)) <= 1) {
      const path: { x: number; y: number }[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }
    
    // Check neighbors
    for (const [dx, dy] of directions) {
      const newX = current.x + dx;
      const newY = current.y + dy;
      const key = `${newX},${newY}`;
      
      if (closedSet.has(key)) continue;
      
      const moveCost = getMoveCost(newX, newY);
      const g = current.g + moveCost;
      
      let neighbor = openSet.find(n => n.x === newX && n.y === newY);
      
      if (!neighbor) {
        neighbor = {
          x: newX,
          y: newY,
          g: g,
          h: heuristic(newX, newY, Math.round(endX), Math.round(endY)),
          f: 0,
          parent: current
        };
        neighbor.f = neighbor.g + neighbor.h;
        openSet.push(neighbor);
      } else if (g < neighbor.g) {
        neighbor.g = g;
        neighbor.f = neighbor.g + neighbor.h;
        neighbor.parent = current;
      }
    }
  }
  
  // Fallback to simple path if A* fails
  const path: { x: number; y: number }[] = [];
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  
  for (let i = 0; i <= steps; i++) {
    const progress = steps > 0 ? i / steps : 0;
    const x = Math.round(startX + (endX - startX) * progress);
    const y = Math.round(startY + (endY - startY) * progress);
    path.push({ x, y });
  }
  
  return path;
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
          let newCitizen = { ...citizen };
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

          // Create citizen sprite
          const isoPos = gridToIso(newCitizen.x, newCitizen.y);
          const sprite = new PIXI.Graphics();
          
          // Rotate sprite based on direction
          if (citizen.direction !== undefined) {
            sprite.rotation = citizen.direction;
          }
          
          // Draw citizen based on type with directional shape
           let baseColor = 0x7ED321; // Default green for citizens
           if (citizen.type === 'worker') {
             baseColor = 0x4A90E2; // Blue for workers
           } else if (citizen.type === 'trader') {
             baseColor = 0xF5A623; // Orange for traders
           }
          
          sprite.beginFill(baseColor);
          sprite.drawCircle(0, 0, 3);
          
          // Add directional indicator
          sprite.beginFill(baseColor, 0.7);
          sprite.drawCircle(2, 0, 1.5);
          sprite.endFill();
          
          // Add activity-based visual indicators
          if (citizen.lastActivity) {
            const timeSinceActivity = Date.now() - citizen.lastActivity;
            const activityIntensity = Math.max(0, 1 - timeSinceActivity / 5000); // Fade over 5 seconds
            
            let activityColor = 0xFFFFFF;
            if (citizen.type === 'worker') {
              activityColor = 0xFFA500; // Orange for working
            } else if (citizen.type === 'trader') {
              activityColor = 0x32CD32; // Green for trading
            } else {
              activityColor = 0x87CEEB; // Sky blue for general activity
            }
            
            sprite.beginFill(activityColor, activityIntensity * 0.6);
            sprite.drawCircle(-1, -4, 1.5);
            sprite.endFill();
          }
          
          // Add path visualization if citizen is following a path
          if (citizen.path && citizen.pathIndex !== undefined) {
            sprite.beginFill(0x00FF00, 0.4); // Green path indicator
            sprite.drawCircle(0, -6, 1.5);
            sprite.endFill();
          }
          
          sprite.position.set(isoPos.x, isoPos.y);
          container.addChild(sprite);

          return newCitizen;
        });
      });

      // Animate vehicles
      setVehicles(prevVehicles => {
        return prevVehicles.map(vehicle => {
          let newVehicle = { ...vehicle };
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

          // Create vehicle sprite
          const isoPos = gridToIso(newVehicle.x, newVehicle.y);
          const sprite = new PIXI.Graphics();
          
          // Rotate sprite based on direction
          if (vehicle.direction !== undefined) {
            sprite.rotation = vehicle.direction;
          }
          
          // Draw vehicle based on type with directional shape
          if (vehicle.type === 'cart') {
            sprite.beginFill(0x8B4513); // Brown for carts
            sprite.drawRect(-6, -3, 12, 6);
            // Add front indicator
            sprite.beginFill(0xA0522D);
            sprite.drawRect(4, -2, 2, 4);
          } else if (vehicle.type === 'wagon') {
            sprite.beginFill(0x654321); // Dark brown for wagons
            sprite.drawRect(-8, -4, 16, 8);
            // Add front indicator
            sprite.beginFill(0x8B4513);
            sprite.drawRect(6, -3, 2, 6);
          } else {
            sprite.beginFill(0x4169E1); // Blue for boats
            sprite.drawEllipse(0, 0, 10, 5);
            // Add bow indicator
            sprite.beginFill(0x6495ED);
            sprite.drawEllipse(6, 0, 4, 2);
          }
          sprite.endFill();
          
          // Add cargo indicator with type-specific color
          if (vehicle.cargo) {
            let cargoColor = 0xFFD700; // Default gold
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
          
          // Add path visualization if vehicle is following a path
          if (vehicle.path && vehicle.pathIndex !== undefined) {
            sprite.beginFill(0x00FF00, 0.3);
            sprite.drawCircle(0, -8, 2);
            sprite.endFill();
          }
          
          sprite.position.set(isoPos.x, isoPos.y);
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
  }, [app, buildings]);

  return null;
}