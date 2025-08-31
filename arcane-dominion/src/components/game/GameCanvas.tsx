"use client";

import { useEffect, useState } from "react";
import { Stage } from "@pixi/react";
import { useGameContext } from "./GameContext";
import Viewport from "./Viewport";

interface GameCanvasProps {
  width?: number;
  height?: number;
  onTileHover?: (x: number, y: number) => void;
  onTileClick?: (x: number, y: number) => void;
}

export default function GameCanvas({ width = 800, height = 600 }: GameCanvasProps) {
  const { setApp } = useGameContext();
  const [size, setSize] = useState({ width, height });

  useEffect(() => {
    const handleResize = () => {
      const newWidth = Math.min(window.innerWidth - 32, width);
      const newHeight = Math.min(window.innerHeight - 200, height);
      setSize({ width: newWidth, height: newHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [width, height]);

  return (
    <Stage
      width={size.width}
      height={size.height}
      options={{
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      }}
      onMount={(app) => setApp(app)}
      onUnmount={() => setApp(null)}
      className="border border-slate-700 rounded-lg"
    >
      <Viewport width={size.width} height={size.height} />
    </Stage>
  );
}

export type { GameCanvasProps };
