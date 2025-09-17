import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { Vec2 } from '../types';
import type { ConstellationLayout } from '../layout/constellation';

interface UseConstellationPanZoomOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  layout: ConstellationLayout;
  size: { w: number; h: number };
  pan: Vec2;
  zoom: number;
  onPanChange: Dispatch<SetStateAction<Vec2>>;
  onZoomChange: Dispatch<SetStateAction<number>>;
}

export interface PanZoomMouseMoveResult {
  canvas: { x: number; y: number };
  world: Vec2;
  isDragging: boolean;
  didPan: boolean;
}

export interface UseConstellationPanZoomResult {
  handleMouseMove: (event: ReactMouseEvent<HTMLCanvasElement>) => PanZoomMouseMoveResult | null;
  handleMouseDown: (event: ReactMouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleWheel: (event: ReactWheelEvent<HTMLCanvasElement>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  zoomTo: (value: number, options?: { animate?: boolean }) => void;
  isDragging: () => boolean;
}

const clampZoom = (value: number) => Math.max(0.2, Math.min(4.0, value));

export function useConstellationPanZoom({
  canvasRef,
  layout,
  size,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
}: UseConstellationPanZoomOptions): UseConstellationPanZoomResult {
  const dragRef = useRef<{ dragging: boolean; start: Vec2; startPan: Vec2 }>({
    dragging: false,
    start: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
  });
  const zoomAnimationRef = useRef<number | null>(null);
  const latestZoomRef = useRef(zoom);

  useEffect(() => {
    latestZoomRef.current = zoom;
  }, [zoom]);

  const clearZoomAnimation = useCallback(() => {
    if (zoomAnimationRef.current !== null) {
      cancelAnimationFrame(zoomAnimationRef.current);
      zoomAnimationRef.current = null;
    }
  }, []);

  useEffect(() => () => clearZoomAnimation(), [clearZoomAnimation]);

  const zoomTo = useCallback(
    (targetZoom: number, options?: { animate?: boolean }) => {
      const clamped = clampZoom(targetZoom);
      if (options?.animate) {
        clearZoomAnimation();
        const step = () => {
          let shouldContinue = true;
          onZoomChange((prev) => {
            const diff = clamped - prev;
            if (Math.abs(diff) <= 0.001) {
              latestZoomRef.current = clamped;
              shouldContinue = false;
              return clamped;
            }
            const next = prev + diff * 0.2;
            latestZoomRef.current = next;
            return next;
          });
          if (shouldContinue) {
            zoomAnimationRef.current = requestAnimationFrame(step);
          } else {
            zoomAnimationRef.current = null;
          }
        };
        zoomAnimationRef.current = requestAnimationFrame(step);
      } else {
        clearZoomAnimation();
        latestZoomRef.current = clamped;
        onZoomChange(clamped);
      }
    },
    [clearZoomAnimation, onZoomChange],
  );

  const zoomIn = useCallback(() => {
    zoomTo(latestZoomRef.current * 1.2);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(latestZoomRef.current * 0.8);
  }, [zoomTo]);

  const resetZoom = useCallback(() => {
    zoomTo(1.0);
    onPanChange({ x: 0, y: 0 });
  }, [zoomTo, onPanChange]);

  const fitToView = useCallback(() => {
    if (layout.nodes.length === 0) return;
    const bounds = layout.nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.x),
        maxX: Math.max(acc.maxX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxY: Math.max(acc.maxY, node.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    const padding = 100;
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    const scaleX = size.w / contentWidth;
    const scaleY = size.h / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 2.0);

    zoomTo(newZoom);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    onPanChange({ x: -centerX * newZoom, y: -centerY * newZoom });
  }, [layout.nodes, size, zoomTo, onPanChange]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      dragRef.current = {
        dragging: true,
        start: { x: mouseX, y: mouseY },
        startPan: { ...pan },
      };
    },
    [canvasRef, pan],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      let didPan = false;
      let panForWorld = pan;

      if (dragRef.current.dragging) {
        const dx = mouseX - dragRef.current.start.x;
        const dy = mouseY - dragRef.current.start.y;
        if (dx !== 0 || dy !== 0) {
          didPan = true;
        }
        const nextPan = {
          x: dragRef.current.startPan.x + dx,
          y: dragRef.current.startPan.y + dy,
        };
        panForWorld = nextPan;
        onPanChange(nextPan);
      }

      const worldX = (mouseX - size.w / 2 - panForWorld.x) / zoom;
      const worldY = (mouseY - size.h / 2 - panForWorld.y) / zoom;

      return {
        canvas: { x: mouseX, y: mouseY },
        world: { x: worldX, y: worldY },
        isDragging: dragRef.current.dragging,
        didPan,
      } satisfies PanZoomMouseMoveResult;
    },
    [canvasRef, onPanChange, pan, size, zoom],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = clampZoom(latestZoomRef.current * zoomFactor);
      zoomTo(newZoom, { animate: true });
    },
    [zoomTo],
  );

  const isDragging = useCallback(() => dragRef.current.dragging, []);

  return useMemo(
    () => ({
      handleMouseMove,
      handleMouseDown,
      handleMouseUp,
      handleMouseLeave,
      handleWheel,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToView,
      zoomTo,
      isDragging,
    }),
    [
      handleMouseMove,
      handleMouseDown,
      handleMouseUp,
      handleMouseLeave,
      handleWheel,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToView,
      zoomTo,
      isDragging,
    ],
  );
}
