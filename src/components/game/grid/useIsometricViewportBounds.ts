"use client";

import { useEffect, useRef } from "react";
import type { Viewport } from "pixi-viewport";

import logger from "@/lib/logger";
import { gridToWorld } from "@/lib/isometric";

interface ViewportBoundsOptions {
  viewport: Viewport | null | undefined;
  gridSize: number;
  tileWidth: number;
  tileHeight: number;
}

export interface IsometricWorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

export function computeIsometricWorldBounds({
  gridSize,
  tileWidth,
  tileHeight,
}: Omit<ViewportBoundsOptions, "viewport">): IsometricWorldBounds {
  if (gridSize <= 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
  }

  const topLeft = gridToWorld(0, 0, tileWidth, tileHeight);
  const topRight = gridToWorld(gridSize - 1, 0, tileWidth, tileHeight);
  const bottomLeft = gridToWorld(0, gridSize - 1, tileWidth, tileHeight);
  const bottomRight = gridToWorld(gridSize - 1, gridSize - 1, tileWidth, tileHeight);

  const allX = [topLeft.worldX, topRight.worldX, bottomLeft.worldX, bottomRight.worldX];
  const allY = [topLeft.worldY, topRight.worldY, bottomLeft.worldY, bottomRight.worldY];

  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export interface ClampSettings {
  clampRect: { left: number; right: number; top: number; bottom: number };
  minScale: number;
  maxScale: number;
}

export function calculateClampSettings(
  bounds: IsometricWorldBounds,
  viewport: Pick<Viewport, "screenWidth" | "screenHeight" | "clamp" | "clampZoom">,
  tileWidth: number,
  tileHeight: number,
): ClampSettings {
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const basePadX = tileWidth * 1.5;
  const basePadY = tileHeight * 1.5;

  const worldMinX = bounds.minX - halfW;
  const worldMaxX = bounds.maxX + halfW;
  const worldMinY = bounds.minY - halfH;
  const worldMaxY = bounds.maxY + halfH;

  const clampRect = {
    left: worldMinX - basePadX,
    right: worldMaxX + basePadX,
    top: worldMinY - basePadY,
    bottom: worldMaxY + basePadY,
  };

  const worldW = worldMaxX - worldMinX + tileWidth;
  const worldH = worldMaxY - worldMinY + tileHeight;

  const fitScale = Math.min(
    (viewport.screenWidth || 1) / Math.max(worldW, 1),
    (viewport.screenHeight || 1) / Math.max(worldH, 1),
  );

  const minScale = Math.max(0.25, Math.min(2, fitScale));

  return {
    clampRect,
    minScale,
    maxScale: 3,
  };
}

export function useIsometricViewportBounds({
  viewport,
  gridSize,
  tileWidth,
  tileHeight,
}: ViewportBoundsOptions) {
  const centeredRef = useRef(false);

  useEffect(() => {
    if (!viewport) {
      logger.warn("useIsometricViewportBounds: No viewport available");
      return;
    }

    if (gridSize <= 0) {
      logger.warn("useIsometricViewportBounds: gridSize must be positive");
      return;
    }

    const bounds = computeIsometricWorldBounds({ gridSize, tileWidth, tileHeight });

    if (!centeredRef.current) {
      viewport.setZoom(1.5);
      viewport.moveCenter(bounds.centerX, bounds.centerY);
      centeredRef.current = true;
      logger.debug(
        `useIsometricViewportBounds: centered viewport at (${bounds.centerX}, ${bounds.centerY})`,
      );
    }

    const updateClamp = () => {
      const { clampRect, minScale, maxScale } = calculateClampSettings(
        bounds,
        viewport,
        tileWidth,
        tileHeight,
      );

      viewport.clamp({ ...clampRect, underflow: "center" });
      viewport.clampZoom({ minScale, maxScale });
    };

    updateClamp();

    const onResize = () => updateClamp();
    window.addEventListener("resize", onResize);
    viewport.on("zoomed", updateClamp);

    return () => {
      window.removeEventListener("resize", onResize);
      viewport.off("zoomed", updateClamp);
      centeredRef.current = false;
    };
  }, [viewport, gridSize, tileWidth, tileHeight]);
}
