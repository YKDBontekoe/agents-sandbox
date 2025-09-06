"use client";

import { useEffect, useRef } from "react";
import { useGameContext } from "./GameContext";

interface MiniMapProps {
  gridSize: number;
  tileWidth?: number;
  tileHeight?: number;
  width?: number;
  height?: number;
}

export default function MiniMap({ gridSize, tileWidth = 64, tileHeight = 32, width = 160, height = 120 }: MiniMapProps) {
  const { viewport } = useGameContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // World bounds for iso grid
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const minX = -((gridSize - 1) * (tileWidth / 2)) - halfW;
  const maxX = ((gridSize - 1) * (tileWidth / 2)) + halfW;
  const minY = -halfH;
  const maxY = ((gridSize - 1) * tileHeight) + halfH;

  const worldToMini = (wx: number, wy: number) => {
    const pad = 6;
    const x = pad + ((wx - minX) / (maxX - minX)) * (width - 2 * pad);
    const y = pad + ((wy - minY) / (maxY - minY)) * (height - 2 * pad);
    return { x, y };
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const vp = viewport;
    if (!canvas || !vp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // draw background (dark)
    ctx.fillStyle = 'rgba(17,24,39,0.9)';
    ctx.strokeStyle = 'rgba(75,85,99,1)';
    ctx.lineWidth = 1;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // draw diamond outline of grid
    const pts = [
      worldToMini(0, -halfH),
      worldToMini(maxX, (gridSize - 1) * tileHeight / 2),
      worldToMini(0, maxY),
      worldToMini(minX, (gridSize - 1) * tileHeight / 2),
    ];
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(100,116,139,1)';
    ctx.stroke();

    // cardinal markers
    ctx.fillStyle = 'rgba(203,213,225,0.9)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', pts[0].x, Math.max(8, pts[0].y - 4));
    ctx.fillText('S', pts[2].x, Math.min(height - 4, pts[2].y + 12));
    ctx.textAlign = 'left';
    ctx.fillText('W', Math.max(4, pts[3].x - 10), pts[3].y + 4);
    ctx.textAlign = 'right';
    ctx.fillText('E', Math.min(width - 4, pts[1].x + 10), pts[1].y + 4);

    // viewport rectangle in world coords (use toWorld to account for pan/zoom properly)
    const topLeftWorld = vp.toWorld(0, 0);
    const bottomRightWorld = vp.toWorld(vp.screenWidth, vp.screenHeight);
    const tl = worldToMini(topLeftWorld.x, topLeftWorld.y);
    const br = worldToMini(bottomRightWorld.x, bottomRightWorld.y);
    ctx.fillStyle = 'rgba(99,102,241,0.15)';
    ctx.strokeStyle = 'rgba(99,102,241,0.7)';
    ctx.lineWidth = 1;
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, br.x - tl.x - 1, br.y - tl.y - 1);
  };

  useEffect(() => {
    if (!viewport) return;
    const onMove = () => draw();
    const onZoom = () => draw();
    viewport.on('moved', onMove);
    viewport.on('zoomed', onZoom);
    draw();
    return () => {
      viewport.off('moved', onMove);
      viewport.off('zoomed', onZoom);
    };
  }, [viewport, gridSize, tileWidth, tileHeight]);

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // invert worldToMini (approximate)
    const pad = 6;
    const wx = minX + ((mx - pad) / (width - 2 * pad)) * (maxX - minX);
    const wy = minY + ((my - pad) / (height - 2 * pad)) * (maxY - minY);
    viewport.moveCenter(wx, wy);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      className="block cursor-pointer"
    />
  );
}

export type { MiniMapProps };
