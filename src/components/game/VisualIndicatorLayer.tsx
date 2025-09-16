"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import type { VisualIndicator } from "@engine";
import { gridToWorld } from "@/lib/isometric";
import { useGameContext } from "./GameContext";

interface VisualIndicatorLayerProps {
  indicators: VisualIndicator[];
  tileWidth?: number;
  tileHeight?: number;
}

const DEFAULT_TILE_WIDTH = 64;
const DEFAULT_TILE_HEIGHT = 32;

const PRIORITY_SCALE: Record<VisualIndicator["priority"], number> = {
  low: 0.85,
  medium: 1,
  high: 1.15,
  critical: 1.3,
};

const PRIORITY_Z_INDEX: Record<VisualIndicator["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const iconTextureCache = new Map<string, PIXI.Texture>();

function resolveColor(color: string | undefined): number {
  if (!color) {
    return 0xffffff;
  }

  const normalized = color.trim();
  const hexString = normalized.startsWith('#')
    ? normalized.slice(1)
    : normalized.startsWith('0x')
      ? normalized.slice(2)
      : normalized;

  const parsed = Number.parseInt(hexString, 16);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0xffffff;
}

function getIconTexture(icon: string, app: PIXI.Application | null): PIXI.Texture {
  const key = icon || "default";
  const cached = iconTextureCache.get(key);
  if (cached) {
    return cached;
  }

  if (!app) {
    return PIXI.Texture.WHITE;
  }

  const graphics = new PIXI.Graphics();
  const size = 32;
  graphics.beginFill(0xffffff, 1);

  switch (icon) {
    case "warning":
      graphics.drawPolygon([
        size / 2, 0,
        size, size,
        0, size,
      ]);
      break;
    case "event_end":
      graphics.drawRoundedRect(0, 0, size, size, 6);
      graphics.lineStyle(4, 0xffffff, 1);
      graphics.moveTo(size * 0.25, size * 0.25);
      graphics.lineTo(size * 0.75, size * 0.75);
      graphics.moveTo(size * 0.75, size * 0.25);
      graphics.lineTo(size * 0.25, size * 0.75);
      break;
    case "event_impact":
      graphics.drawStar(size / 2, size / 2, 5, size / 2.2, size / 4);
      break;
    case "mood":
      graphics.drawCircle(size / 2, size / 2, size / 2.5);
      graphics.endFill();
      graphics.beginFill(0xffffff, 1);
      graphics.drawCircle(size * 0.35, size * 0.4, size * 0.08);
      graphics.drawCircle(size * 0.65, size * 0.4, size * 0.08);
      graphics.moveTo(size * 0.3, size * 0.65);
      graphics.quadraticCurveTo(size / 2, size * 0.85, size * 0.7, size * 0.65);
      break;
    default:
      graphics.drawCircle(size / 2, size / 2, size / 2.4);
      break;
  }

  graphics.endFill();

  const texture = app.renderer.generateTexture(graphics);
  graphics.destroy();
  iconTextureCache.set(key, texture);
  return texture;
}

export function VisualIndicatorLayer({
  indicators,
  tileWidth = DEFAULT_TILE_WIDTH,
  tileHeight = DEFAULT_TILE_HEIGHT,
}: VisualIndicatorLayerProps) {
  const { viewport, app } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);

  useEffect(() => {
    if (!viewport) return;

    let container = containerRef.current;
    if (!container) {
      container = new PIXI.Container();
      container.name = "visual-indicator-layer";
      container.sortableChildren = true;
      viewport.addChild(container);
      containerRef.current = container;
    }

    const previous = container.removeChildren();
    previous.forEach(child => {
      child.destroy();
    });

    for (const indicator of indicators) {
      const { worldX, worldY } = gridToWorld(
        indicator.position.x,
        indicator.position.y,
        tileWidth,
        tileHeight,
      );

      const sprite = new PIXI.Sprite(getIconTexture(indicator.icon, app ?? null));
      sprite.anchor.set(0.5, 1);
      sprite.tint = resolveColor(indicator.color);
      const size = 26 * (PRIORITY_SCALE[indicator.priority] ?? 1);
      sprite.width = size;
      sprite.height = size;
      sprite.alpha = indicator.priority === "critical" ? 0.95 : 0.82;
      sprite.position.set(worldX, worldY - tileHeight * 0.25);
      sprite.zIndex = PRIORITY_Z_INDEX[indicator.priority];
      sprite.name = indicator.id;
      container.addChild(sprite);

      const textContent = Number.isFinite(indicator.change) && indicator.change !== 0
        ? `${indicator.change > 0 ? "+" : ""}${Math.round(indicator.change)}`
        : (Number.isFinite(indicator.value)
          ? `${Math.round(indicator.value)}`
          : null);

      if (textContent) {
        const label = new PIXI.Text(
          textContent,
          {
            fill: 0xf8fafc,
            fontSize: 11,
            fontWeight: "600",
          },
        );
        label.anchor.set(0.5, 0);
        label.position.set(worldX, worldY - tileHeight * 0.25 - size - 6);
        label.alpha = 0.9;
        label.zIndex = sprite.zIndex;
        container.addChild(label);
      }
    }

    return () => {
      // Keep container attached for reuse; children cleared on next render
    };
  }, [viewport, app, indicators, tileWidth, tileHeight]);

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeChildren();
        if (containerRef.current.parent) {
          containerRef.current.parent.removeChild(containerRef.current);
        }
        containerRef.current.destroy({ children: true });
        containerRef.current = null;
      }
    };
  }, []);

  return null;
}

export type { VisualIndicatorLayerProps };

export default VisualIndicatorLayer;
