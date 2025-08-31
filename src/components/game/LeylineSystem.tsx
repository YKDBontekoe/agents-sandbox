import React, { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { useGameContext } from './GameContext';

export interface Leyline {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  capacity: number;
  currentFlow: number;
  isActive: boolean;
}

export interface LeylineSystemProps {
  leylines: Leyline[];
  onLeylineCreate?: (fromX: number, fromY: number, toX: number, toY: number) => void;
  onLeylineSelect?: (leyline: Leyline | null) => void;
  selectedLeyline?: Leyline | null;
  isDrawingMode?: boolean;
}

export const LeylineSystem: React.FC<LeylineSystemProps> = ({
  leylines,
  onLeylineCreate,
  onLeylineSelect,
  selectedLeyline,
  isDrawingMode = false
}) => {
  const { app, viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const drawingLineRef = useRef<PIXI.Graphics | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const leylineSpritesRef = useRef<Map<string, PIXI.Graphics>>(new Map());
  const labelContainerRef = useRef<PIXI.Container | null>(null);

  // Convert grid coordinates to world coordinates
  const gridToWorld = useCallback((gridX: number, gridY: number) => {
    const tileWidth = 64;
    const tileHeight = 32;
    const worldX = (gridX - gridY) * (tileWidth / 2);
    const worldY = (gridX + gridY) * (tileHeight / 2);
    return { x: worldX, y: worldY };
  }, []);

  // Convert world coordinates to grid coordinates
  const worldToGrid = useCallback((worldX: number, worldY: number) => {
    const tileWidth = 64;
    const tileHeight = 32;
    const gridX = (worldX / (tileWidth / 2) + worldY / (tileHeight / 2)) / 2;
    const gridY = (worldY / (tileHeight / 2) - worldX / (tileWidth / 2)) / 2;
    return { x: Math.round(gridX), y: Math.round(gridY) };
  }, []);

  // Create leyline visual
  const createLeylineGraphics = useCallback((leyline: Leyline) => {
    const graphics = new PIXI.Graphics();
    
    const fromWorld = gridToWorld(leyline.fromX, leyline.fromY);
    const toWorld = gridToWorld(leyline.toX, leyline.toY);
    
    // Calculate flow intensity (0-1)
    const flowIntensity = Math.min(leyline.currentFlow / leyline.capacity, 1);
    
    // Base line properties
    const baseThickness = 2;
    const maxThickness = 8;
    const thickness = baseThickness + (maxThickness - baseThickness) * flowIntensity;
    
    // Color based on flow intensity
    const baseColor = 0x4a90e2; // Blue
    const activeColor = 0x7c4dff; // Purple
    const color = leyline.isActive ? activeColor : baseColor;
    
    // Alpha based on flow
    const baseAlpha = 0.3;
    const maxAlpha = 0.9;
    const alpha = baseAlpha + (maxAlpha - baseAlpha) * flowIntensity;
    
    // Draw main line
    graphics.lineStyle(thickness, color, alpha);
    graphics.moveTo(fromWorld.x, fromWorld.y);
    graphics.lineTo(toWorld.x, toWorld.y);
    
    // Add glow effect for high flow
    if (flowIntensity > 0.5) {
      graphics.lineStyle(thickness * 2, color, alpha * 0.3);
      graphics.moveTo(fromWorld.x, fromWorld.y);
      graphics.lineTo(toWorld.x, toWorld.y);
    }
    
    // Add selection highlight
    if (selectedLeyline && selectedLeyline.id === leyline.id) {
      graphics.lineStyle(thickness + 4, 0xffffff, 0.5);
      graphics.moveTo(fromWorld.x, fromWorld.y);
      graphics.lineTo(toWorld.x, toWorld.y);
    }
    
    // Make interactive
    graphics.interactive = true;
    graphics.cursor = 'pointer';
    graphics.hitArea = new PIXI.Polygon([
      fromWorld.x - thickness, fromWorld.y - thickness,
      toWorld.x - thickness, toWorld.y - thickness,
      toWorld.x + thickness, toWorld.y + thickness,
      fromWorld.x + thickness, fromWorld.y + thickness
    ]);
    
    graphics.on('pointerdown', () => {
      onLeylineSelect?.(leyline);
    });
    
    return graphics;
  }, [gridToWorld, selectedLeyline, onLeylineSelect]);

  // Create capacity label
  const createCapacityLabel = useCallback((leyline: Leyline) => {
    if (!selectedLeyline || selectedLeyline.id !== leyline.id) {
      return null;
    }
    
    const fromWorld = gridToWorld(leyline.fromX, leyline.fromY);
    const toWorld = gridToWorld(leyline.toX, leyline.toY);
    
    // Position label at midpoint
    const midX = (fromWorld.x + toWorld.x) / 2;
    const midY = (fromWorld.y + toWorld.y) / 2;
    
    const container = new PIXI.Container();
    
    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.8);
    bg.drawRoundedRect(-30, -10, 60, 20, 5);
    bg.endFill();
    container.addChild(bg);
    
    // Text
    const text = new PIXI.Text(`${leyline.currentFlow}/${leyline.capacity}`, {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center'
    });
    text.anchor.set(0.5);
    container.addChild(text);
    
    container.x = midX;
    container.y = midY - 20; // Offset above the line
    
    return container;
  }, [gridToWorld, selectedLeyline]);

  // Handle mouse events for drawing
  const handlePointerDown = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (!isDrawingMode || !viewport) return;
    
    const worldPos = viewport.toWorld(event.global);
    const gridPos = worldToGrid(worldPos.x, worldPos.y);
    
    isDrawingRef.current = true;
    startPointRef.current = { x: gridPos.x, y: gridPos.y };
    
    // Create drawing line
    if (drawingLineRef.current) {
      drawingLineRef.current.destroy();
    }
    
    drawingLineRef.current = new PIXI.Graphics();
    containerRef.current?.addChild(drawingLineRef.current);
  }, [isDrawingMode, viewport, worldToGrid]);

  const handlePointerMove = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (!isDrawingRef.current || !drawingLineRef.current || !startPointRef.current || !viewport) return;
    
    const worldPos = viewport.toWorld(event.global);
    const startWorld = gridToWorld(startPointRef.current.x, startPointRef.current.y);
    
    drawingLineRef.current.clear();
    drawingLineRef.current.lineStyle(3, 0xffffff, 0.7);
    drawingLineRef.current.moveTo(startWorld.x, startWorld.y);
    drawingLineRef.current.lineTo(worldPos.x, worldPos.y);
  }, [viewport, gridToWorld]);

  const handlePointerUp = useCallback((event: PIXI.FederatedPointerEvent) => {
    if (!isDrawingRef.current || !startPointRef.current || !viewport) return;
    
    const worldPos = viewport.toWorld(event.global);
    const endGridPos = worldToGrid(worldPos.x, worldPos.y);
    
    // Only create leyline if we moved to a different tile
    if (startPointRef.current.x !== endGridPos.x || startPointRef.current.y !== endGridPos.y) {
      onLeylineCreate?.(startPointRef.current.x, startPointRef.current.y, endGridPos.x, endGridPos.y);
    }
    
    // Clean up
    isDrawingRef.current = false;
    startPointRef.current = null;
    
    if (drawingLineRef.current) {
      drawingLineRef.current.destroy();
      drawingLineRef.current = null;
    }
  }, [viewport, worldToGrid, onLeylineCreate]);

  // Handle ESC key to cancel drawing
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawingRef.current) {
        isDrawingRef.current = false;
        startPointRef.current = null;
        
        if (drawingLineRef.current) {
          drawingLineRef.current.destroy();
          drawingLineRef.current = null;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize container
  useEffect(() => {
    if (!app || !viewport) return;
    
    const container = new PIXI.Container();
    const labelContainer = new PIXI.Container();
    
    containerRef.current = container;
    labelContainerRef.current = labelContainer;
    
    viewport.addChild(container);
    viewport.addChild(labelContainer);
    
    // Add drawing event listeners
    if (isDrawingMode) {
      viewport.on('pointerdown', handlePointerDown);
      viewport.on('pointermove', handlePointerMove);
      viewport.on('pointerup', handlePointerUp);
    }
    
    return () => {
      if (isDrawingMode) {
        viewport.off('pointerdown', handlePointerDown);
        viewport.off('pointermove', handlePointerMove);
        viewport.off('pointerup', handlePointerUp);
      }
      
      container.destroy({ children: true });
      labelContainer.destroy({ children: true });
      containerRef.current = null;
      labelContainerRef.current = null;
      leylineSpritesRef.current.clear();
    };
  }, [app, viewport, isDrawingMode, handlePointerDown, handlePointerMove, handlePointerUp]);

  // Update leylines
  useEffect(() => {
    if (!containerRef.current || !labelContainerRef.current) return;
    
    const container = containerRef.current;
    const labelContainer = labelContainerRef.current;
    const sprites = leylineSpritesRef.current;
    
    // Clear existing sprites
    container.removeChildren();
    labelContainer.removeChildren();
    sprites.clear();
    
    // Create new sprites
    leylines.forEach(leyline => {
      const graphics = createLeylineGraphics(leyline);
      container.addChild(graphics);
      sprites.set(leyline.id, graphics);
      
      // Add capacity label if selected
      const label = createCapacityLabel(leyline);
      if (label) {
        labelContainer.addChild(label);
      }
    });
  }, [leylines, createLeylineGraphics, createCapacityLabel]);

  return null; // This component only manages PixiJS objects
};

export default LeylineSystem;