"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";

export enum DistrictType {
  FARM = "farm",
  FORGE = "forge",
  SANCTUM = "sanctum",
  MARKET = "market",
  WELL = "well",
  WATCHTOWER = "watchtower",
}

export enum DistrictTier {
  TIER_1 = 1,
  TIER_2 = 2,
  TIER_3 = 3,
}

export enum DistrictState {
  NORMAL = "normal",
  DISABLED = "disabled",
  EMPOWERED = "empowered",
}

export interface District {
  id: string;
  type: DistrictType;
  tier: DistrictTier;
  state: DistrictState;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
}

interface DistrictSprite {
  district: District;
  sprite: PIXI.Container;
  background: PIXI.Graphics;
  icon: PIXI.Graphics;
  tierIndicator: PIXI.Graphics;
  stateOverlay: PIXI.Graphics;
}

interface DistrictSpritesProps {
  districts: District[];
  tileWidth?: number;
  tileHeight?: number;
  onDistrictClick?: (district: District) => void;
  onDistrictHover?: (district: District | null) => void;
}

export default function DistrictSprites({
  districts,
  tileWidth = 64,
  tileHeight = 32,
  onDistrictClick,
  onDistrictHover,
}: DistrictSpritesProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const spritesRef = useRef<Map<string, DistrictSprite>>(new Map());

  // Convert grid coordinates to world coordinates (isometric)
  const gridToWorld = (gridX: number, gridY: number) => {
    const worldX = (gridX - gridY) * (tileWidth / 2);
    const worldY = (gridX + gridY) * (tileHeight / 2);
    return { worldX, worldY };
  };

  // Get district type colors
  const getDistrictColors = (type: DistrictType) => {
    switch (type) {
      case DistrictType.FARM:
        return { primary: 0x4ade80, secondary: 0x22c55e }; // Green
      case DistrictType.FORGE:
        return { primary: 0xf97316, secondary: 0xea580c }; // Orange
      case DistrictType.SANCTUM:
        return { primary: 0x8b5cf6, secondary: 0x7c3aed }; // Purple
      case DistrictType.MARKET:
        return { primary: 0xeab308, secondary: 0xca8a04 }; // Yellow
      case DistrictType.WELL:
        return { primary: 0x06b6d4, secondary: 0x0891b2 }; // Cyan
      case DistrictType.WATCHTOWER:
        return { primary: 0xef4444, secondary: 0xdc2626 }; // Red
      default:
        return { primary: 0x64748b, secondary: 0x475569 }; // Gray
    }
  };

  // Create district icon based on type
  const createDistrictIcon = (type: DistrictType, size: number) => {
    const icon = new PIXI.Graphics();
    const colors = getDistrictColors(type);
    
    icon.beginFill(colors.primary);
    
    switch (type) {
      case DistrictType.FARM:
        // Simple house shape
        icon.drawRect(-size/3, -size/4, size*2/3, size/2);
        icon.drawPolygon([-size/3, -size/4, 0, -size/2, size/3, -size/4]);
        break;
      case DistrictType.FORGE:
        // Anvil shape
        icon.drawRect(-size/4, -size/6, size/2, size/4);
        icon.drawRect(-size/3, size/6, size*2/3, size/8);
        break;
      case DistrictType.SANCTUM:
        // Crystal/diamond shape
        icon.drawPolygon([0, -size/2, size/3, -size/6, size/3, size/6, 0, size/2, -size/3, size/6, -size/3, -size/6]);
        break;
      case DistrictType.MARKET:
        // Tent/stall shape
        icon.drawPolygon([-size/3, size/4, -size/6, -size/4, size/6, -size/4, size/3, size/4]);
        break;
      case DistrictType.WELL:
        // Circle (well) - outer ring
        icon.drawCircle(0, 0, size/3);
        icon.endFill();
        // Inner hole
        icon.beginFill(0x1a1a2e); // Background color
        icon.drawCircle(0, 0, size/6);
        break;
      case DistrictType.WATCHTOWER:
        // Tower shape
        icon.drawRect(-size/6, -size/2, size/3, size);
        icon.drawRect(-size/4, -size/2, size/2, size/4);
        break;
    }
    
    icon.endFill();
    return icon;
  };

  // Create tier indicator
  const createTierIndicator = (tier: DistrictTier, size: number) => {
    const indicator = new PIXI.Graphics();
    
    for (let i = 0; i < tier; i++) {
      indicator.beginFill(0xfbbf24);
      indicator.drawCircle(-size/3 + (i * size/6), size/3, size/12);
      indicator.endFill();
    }
    
    return indicator;
  };

  // Create state overlay
  const createStateOverlay = (state: DistrictState, size: number) => {
    const overlay = new PIXI.Graphics();
    
    switch (state) {
      case DistrictState.DISABLED:
        overlay.beginFill(0x000000, 0.5);
        overlay.drawRect(-size/2, -size/2, size, size);
        overlay.endFill();
        // Red X
        overlay.lineStyle(3, 0xef4444);
        overlay.moveTo(-size/4, -size/4);
        overlay.lineTo(size/4, size/4);
        overlay.moveTo(size/4, -size/4);
        overlay.lineTo(-size/4, size/4);
        break;
      case DistrictState.EMPOWERED:
        // Golden glow effect
        overlay.beginFill(0xfbbf24, 0.3);
        overlay.drawCircle(0, 0, size/2 + 5);
        overlay.endFill();
        break;
    }
    
    return overlay;
  };

  // Create district sprite
  const createDistrictSprite = (district: District) => {
    const container = new PIXI.Container();
    const { worldX, worldY } = gridToWorld(district.gridX, district.gridY);
    
    container.x = worldX;
    container.y = worldY;
    container.interactive = true;
    container.cursor = 'pointer';
    
    // Background (elevated platform)
    const background = new PIXI.Graphics();
    background.beginFill(0x374151, 0.8);
    background.lineStyle(1, 0x6b7280);
    background.drawEllipse(0, tileHeight/4, tileWidth/3, tileHeight/6);
    background.endFill();
    
    // District icon
    const icon = createDistrictIcon(district.type, 24);
    
    // Tier indicator
    const tierIndicator = createTierIndicator(district.tier, 24);
    
    // State overlay
    const stateOverlay = createStateOverlay(district.state, 32);
    
    container.addChild(background);
    container.addChild(icon);
    container.addChild(tierIndicator);
    container.addChild(stateOverlay);
    
    // Interaction events
    container.on('pointerover', () => {
      container.scale.set(1.1);
      onDistrictHover?.(district);
    });
    
    container.on('pointerout', () => {
      container.scale.set(1.0);
      onDistrictHover?.(null);
    });
    
    container.on('pointerdown', () => {
      onDistrictClick?.(district);
    });
    
    return {
      district,
      sprite: container,
      background,
      icon,
      tierIndicator,
      stateOverlay,
    };
  };

  // Initialize districts
  useEffect(() => {
    if (!viewport) return;

    const container = new PIXI.Container();
    container.name = 'districts';
    container.sortableChildren = true;
    viewport.addChild(container);
    containerRef.current = container;

    return () => {
      if (container.parent) {
        container.parent.removeChild(container);
      }
      container.destroy({ children: true });
      spritesRef.current.clear();
    };
  }, [viewport]);

  // Update districts when data changes
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const sprites = spritesRef.current;
    
    // Remove districts that no longer exist
    const currentIds = new Set(districts.map(d => d.id));
    sprites.forEach((sprite, id) => {
      if (!currentIds.has(id)) {
        container.removeChild(sprite.sprite);
        sprite.sprite.destroy({ children: true });
        sprites.delete(id);
      }
    });
    
    // Add or update districts
    districts.forEach(district => {
      const existing = sprites.get(district.id);
      
      if (existing) {
        // Update existing district
        const { worldX, worldY } = gridToWorld(district.gridX, district.gridY);
        existing.sprite.x = worldX;
        existing.sprite.y = worldY;
        
        // Update visual elements if needed
        if (existing.district.type !== district.type ||
            existing.district.tier !== district.tier ||
            existing.district.state !== district.state) {
          
          // Remove old elements
          existing.sprite.removeChild(existing.icon);
          existing.sprite.removeChild(existing.tierIndicator);
          existing.sprite.removeChild(existing.stateOverlay);
          
          // Create new elements
          const newIcon = createDistrictIcon(district.type, 24);
          const newTierIndicator = createTierIndicator(district.tier, 24);
          const newStateOverlay = createStateOverlay(district.state, 32);
          
          existing.sprite.addChild(newIcon);
          existing.sprite.addChild(newTierIndicator);
          existing.sprite.addChild(newStateOverlay);
          
          existing.icon = newIcon;
          existing.tierIndicator = newTierIndicator;
          existing.stateOverlay = newStateOverlay;
        }
        
        existing.district = district;
      } else {
        // Create new district
        const sprite = createDistrictSprite(district);
        sprite.sprite.zIndex = 100; // Above grid
        container.addChild(sprite.sprite);
        sprites.set(district.id, sprite);
      }
    });
  }, [districts, tileWidth, tileHeight]);

  return null; // This component doesn't render React elements
}

export type { DistrictSpritesProps, DistrictSprite };