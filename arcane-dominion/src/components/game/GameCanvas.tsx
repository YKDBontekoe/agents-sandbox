"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGameContext } from "./GameContext";

interface GameCanvasProps {
  width?: number;
  height?: number;
  onTileHover?: (x: number, y: number) => void;
  onTileClick?: (x: number, y: number) => void;
}

export default function GameCanvas({
  width = 800,
  height = 600,
  onTileHover,
  onTileClick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { setApp, setViewport } = useGameContext();

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const initPixi = async () => {
      try {
        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
          throw new Error('WebGL not supported');
        }

        // Create PIXI Application with fallback options
        const app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0x1a1a2e,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: 'webgl',
        });

        appRef.current = app;

        // Create viewport for pan/zoom functionality
        const viewport = new Viewport({
          screenWidth: width,
          screenHeight: height,
          worldWidth: 2000,
          worldHeight: 2000,
          events: app.renderer.events,
        });

        // Add viewport to stage
        app.stage.addChild(viewport);
        viewportRef.current = viewport;

        // Configure viewport plugins
        viewport
          .drag({
            mouseButtons: "left",
          })
          .pinch()
          .wheel({
            smooth: 3,
            percent: 0.1,
          })
          .decelerate({
            friction: 0.95,
            bounce: 0.8,
            minSpeed: 0.01,
          })
          .clampZoom({
            minScale: 0.1,
            maxScale: 3,
          })
          .clamp({
            left: -500,
            right: 2500,
            top: -500,
            bottom: 2500,
          });

        // Center the viewport
        viewport.moveCenter(1000, 1000);
        viewport.setZoom(0.8);

        // Share references through context
        setApp(app);
        setViewport(viewport);

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize PixiJS:", error);
        setInitError(error instanceof Error ? error.message : 'Unknown WebGL error');
        setIsInitialized(true); // Set to true to stop loading state
      }
    };

    initPixi();

    // Cleanup function
    return () => {
      if (appRef.current) {
        setApp(null);
        setViewport(null);
        appRef.current.destroy(true, {
          children: true,
          texture: true,
        });
        appRef.current = null;
        viewportRef.current = null;
        setIsInitialized(false);
      }
    };
  }, [width, height, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current && viewportRef.current) {
        const newWidth = Math.min(window.innerWidth - 32, width);
        const newHeight = Math.min(window.innerHeight - 200, height);
        
        appRef.current.renderer.resize(newWidth, newHeight);
        viewportRef.current.resize(newWidth, newHeight);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial resize

    return () => window.removeEventListener("resize", handleResize);
  }, [width, height, isInitialized]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border border-slate-700 rounded-lg"
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
        }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-75 rounded-lg">
          <div className="text-slate-400">Initializing game canvas...</div>
        </div>
      )}
      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75 rounded-lg">
          <div className="text-center text-red-200">
            <div className="text-lg font-semibold mb-2">WebGL Error</div>
            <div className="text-sm mb-2">{initError}</div>
            <div className="text-xs text-red-300">
              Your browser may not support WebGL or hardware acceleration is disabled.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export types for external use
export type { GameCanvasProps };