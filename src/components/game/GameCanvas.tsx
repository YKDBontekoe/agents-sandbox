"use client";

import { useEffect } from "react";
import logger from "@/lib/logger";
import { publicConfig as config } from "@infrastructure/config";
import { usePixiApplication } from "@/hooks/usePixiApplication";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import { attachCanvasEvents } from "./CanvasEvents";

interface GameCanvasProps {
  width?: number;
  height?: number;
  onTileHover?: (x: number, y: number, tileType?: string) => void;
  onTileClick?: (x: number, y: number, tileType?: string) => void;
}

export default function GameCanvas({
  width = 800,
  height = 600,
  onTileHover,
  onTileClick,
}: GameCanvasProps) {
  useEffect(() => {
    logger.debug("GameCanvas mounted", { width, height });
    return () => logger.debug("GameCanvas unmounted");
  }, [width, height]);

  const { canvasRef, app, viewport, isInitialized, initError } =
    usePixiApplication({ width, height });
  const { fps, quality } = useAdaptiveQuality(app);

  useEffect(() => {
    if (!viewport) return;
    return attachCanvasEvents({ viewport, onTileHover, onTileClick });
  }, [viewport, onTileHover, onTileClick]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "400px" }}>
      {config.nodeEnv === "development" && isInitialized && (
        <div className="absolute top-2 left-2 bg-gray-800/80 border border-gray-700 text-white px-2 py-1 rounded text-xs font-mono z-10">
          <div>FPS: {fps}</div>
          <div>Quality: {quality}</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full game-canvas"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          backgroundColor: "#111827",
          minHeight: "400px",
        }}
      />

      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/85 backdrop-blur-sm">
          <div className="text-center text-gray-200">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-700 mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="text-lg font-medium mb-2">Preparing the Map</div>
            <div className="text-sm text-gray-400">Loading renderer…</div>
            <div className="mt-4 flex justify-center space-x-1">
              <div
                className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
          <div className="text-center p-6 max-w-md text-gray-200 border border-gray-700 rounded-lg bg-gray-800/70">
            <div className="mb-4">
              <svg
                className="w-12 h-12 text-red-400 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-red-300 mb-2">
              Canvas Failed to Load
            </h3>
            <p className="text-sm text-gray-300 mb-4">{initError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { GameCanvasProps };
