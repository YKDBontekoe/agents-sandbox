"use client";

import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGameContext } from "./GameContext";
import logger from "@/lib/logger";
import { publicConfig as config } from "@/infrastructure/config";
import { AdaptiveQualityManager } from "@/utils/performance";

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
  logger.debug("GameCanvas component mounted with props:", { width, height });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const contextLostHandlerRef = useRef<((event: Event) => void) | null>(null);
  const contextRestoredHandlerRef = useRef<((event: Event) => void) | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const qualityManagerRef = useRef<AdaptiveQualityManager | null>(null);
  const { setApp, setViewport } = useGameContext();

  useEffect(() => {
    logger.debug("GameCanvas useEffect triggered with width:", width, "height:", height);
    logger.debug("Canvas ref available:", !!canvasRef.current);
    logger.debug("Is initialized:", isInitialized);
    
    if (!canvasRef.current) {
      logger.error("Canvas ref is not available!");
      return;
    }
    
    if (isInitialized) {
      logger.debug("Canvas already initialized, skipping");
      return;
    }

    const initPixi = async () => {
        const initializeCanvas = async () => {
          logger.debug("Starting PIXI initialization...");
        // Create PIXI Application with enhanced fallback options
        const app = new PIXI.Application();
        
        // Performance-optimized initialization options
        const initOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0xf5f7fb,
          antialias: window.devicePixelRatio <= 1, // Disable on high-DPI for performance
          resolution: Math.min(window.devicePixelRatio || 1, 2), // Cap at 2x for performance
          autoDensity: true,
          // Let PIXI auto-detect the best renderer; avoid hard failures on some browsers
          hello: false, // Disable PIXI banner in console
          // Performance optimizations
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false, // Allow fallback to software rendering
          powerPreference: 'high-performance' as const, // Request high-performance GPU
          premultipliedAlpha: false, // Better performance for most use cases
        };
        
        await app.init(initOptions);

        // Add WebGL context loss handling
        const canvas = app.canvas as HTMLCanvasElement;
        
        contextLostHandlerRef.current = (event: Event) => {
          logger.warn("WebGL context lost, preventing default behavior");
          event.preventDefault();
          setInitError('WebGL context lost. The game will attempt to restore automatically.');
        };
        
        contextRestoredHandlerRef.current = () => {
          logger.debug("WebGL context restored, reinitializing...");
          setInitError(null);
          setIsInitialized(false);
          // Trigger reinitialization
          setTimeout(() => {
            if (canvasRef.current) {
              initPixi();
            }
          }, 100);
        };
        
        canvas.addEventListener('webglcontextlost', contextLostHandlerRef.current);
        canvas.addEventListener('webglcontextrestored', contextRestoredHandlerRef.current);

        // Enhanced performance optimizations
        app.ticker.maxFPS = 60; // Cap frame rate for consistent performance
        app.ticker.minFPS = 30; // Minimum acceptable frame rate
        
        // Enable texture garbage collection (modern PIXI.js API)
        if (app.renderer.textureGC) {
          app.renderer.textureGC.maxIdle = 60 * 60; // 1 minute idle time
          app.renderer.textureGC.checkCountMax = 600; // Check every 10 seconds at 60fps
        }
        
        // Optimize renderer settings
        if ('batchSize' in app.renderer) {
          // Increase batch size for better performance if supported
          (app.renderer as PIXI.Renderer & { batchSize?: number }).batchSize = 4096;
        }
        
        // Initialize adaptive quality manager
        const qualityManager = new AdaptiveQualityManager((newQuality) => {
          setQuality(newQuality);
          const settings = qualityManager.getQualitySettings();
          
          // Apply quality settings to renderer
          app.renderer.resolution = settings.resolution;
          app.renderer.resize(canvas.width, canvas.height);
          
          // Update antialias if possible (requires renderer recreation for full effect)
          console.log(`Quality adjusted to: ${newQuality} (Resolution: ${settings.resolution})`);
        });
        
        qualityManagerRef.current = qualityManager;
        qualityManager.start();
        
        // FPS monitoring for display
        let lastTime = performance.now();
        let frameCount = 0;
        
        const fpsMonitor = () => {
          const currentTime = performance.now();
          frameCount++;
          
          if (frameCount % 60 === 0) {
            const fps = Math.round(1000 / ((currentTime - lastTime) / 60));
            setFps(fps);
            lastTime = currentTime;
          }
        };
        
        app.ticker.add(fpsMonitor);

        appRef.current = app;

        // Create viewport for pan/zoom functionality
        const viewport = new Viewport({
          screenWidth: width,
          screenHeight: height,
          worldWidth: 2000,
          worldHeight: 2000,
          events: app.renderer.events,
        });

        // Add viewport to stage and enable zIndex sorting among layer containers
        viewport.sortableChildren = true;
        app.stage.addChild(viewport);
        viewportRef.current = viewport;

        // Configure viewport plugins
        viewport
          .drag({
            mouseButtons: "all",
          })
          .pinch()
          .decelerate({
            friction: 0.92,
            bounce: 0.0,
            minSpeed: 0.02,
          })
          .clampZoom({
            minScale: 0.2,
            maxScale: 3,
          })
          .wheel({ smooth: 0, percent: 0.12 });

        // Removed default centering/zoom; IsometricGrid manages it to prevent conflicts
        // viewport.moveCenter(0, 0);
        // viewport.setZoom(0.8);

        // Share references through context
        setApp(app);
        setViewport(viewport);

        setIsInitialized(true);
        logger.debug("PIXI Application initialized successfully");
        logger.debug("App canvas dimensions:", app.canvas.width, "x", app.canvas.height);
        logger.debug("Viewport world size:", viewport.worldWidth, "x", viewport.worldHeight);
        logger.debug("Viewport position:", viewport.x, viewport.y);
        logger.debug("Viewport scale:", viewport.scale.x, viewport.scale.y);
      };

      const initializeFallbackCanvas = async () => {
        logger.debug("Initializing fallback canvas with reduced settings...");
        
        const app = new PIXI.Application();
        
        const fallbackOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0xf5f7fb,
          antialias: false,
          resolution: 1,
          autoDensity: false,
          // No explicit preference; allow detection
          hello: false,
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: true,
        };
        
        await app.init(fallbackOptions);
        
        appRef.current = app;
        
        // Create basic viewport without advanced features
        const viewport = new Viewport({
          screenWidth: width,
          screenHeight: height,
          worldWidth: 2000,
          worldHeight: 2000,
          events: app.renderer.events,
        });
        
        app.stage.addChild(viewport);
        viewportRef.current = viewport;
        
        // Basic viewport configuration
        viewport.drag({ mouseButtons: "left" })
          .clampZoom({
            minScale: 0.2,
            maxScale: 3,
          })
          .wheel({ smooth: 0, percent: 0.12 });
        // Removed default centering/zoom to avoid conflict with grid centering
        // viewport.moveCenter(1000, 1000);
        // viewport.setZoom(0.8);
        
        setApp(app);
        setViewport(viewport);
        setIsInitialized(true);
        logger.debug("Fallback canvas initialized successfully");
      };

      try {
        await initializeCanvas();
      } catch (error) {
        logger.error("Failed to initialize game canvas:", error);
        
        // Try fallback initialization with reduced settings
        try {
          logger.debug("Attempting fallback canvas initialization...");
          await initializeFallbackCanvas();
        } catch (fallbackError) {
          logger.error("Fallback initialization also failed:", fallbackError);
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown WebGL error';
          setInitError('Failed to initialize game canvas. Your browser may not support WebGL.');
          setIsInitialized(true); // Set to true to stop loading state
          
          // Provide helpful error messages based on common issues
          if (errorMessage.includes('WebGL')) {
            logger.warn("WebGL initialization failed. This may be due to:");
            logger.warn("- Hardware acceleration disabled");
            logger.warn("- Outdated graphics drivers");
            logger.warn("- Browser security settings");
          }
        }
      }
    };

    initPixi();
  }, [width, height]);

  // Enhanced cleanup with memory management
  useEffect(() => {
    return () => {
      // Stop performance monitoring
      if (qualityManagerRef.current) {
        qualityManagerRef.current.stop();
        qualityManagerRef.current = null;
      }
      
      if (appRef.current) {
        // Remove WebGL context event listeners
        const canvas = appRef.current.canvas as HTMLCanvasElement;
        if (canvas) {
          if (contextLostHandlerRef.current) {
            canvas.removeEventListener('webglcontextlost', contextLostHandlerRef.current);
          }
          if (contextRestoredHandlerRef.current) {
            canvas.removeEventListener('webglcontextrestored', contextRestoredHandlerRef.current);
          }
        }
        
        // Stop ticker; Application.destroy will dispose it safely
        appRef.current.ticker.stop();
        
        // Clean up viewport
        if (viewportRef.current) {
          viewportRef.current.destroy({ children: true });
          viewportRef.current = null;
        }
        
        // Destroy application with comprehensive cleanup (destroys ticker/renderer internally)
        appRef.current.destroy(true, { children: true, texture: true });
        
        appRef.current = null;
      }
      
      // Reset state
      setApp(null);
      setViewport(null);
      setIsInitialized(false);
    };
  }, []);

  // Handle resize to provided dimensions
  useEffect(() => {
    const applySize = () => {
      if (appRef.current && viewportRef.current) {
        const newWidth = width;
        const newHeight = height;
        appRef.current.renderer.resize(newWidth, newHeight);
        viewportRef.current.resize(newWidth, newHeight);
      }
    };
    applySize();
    const onResize = () => applySize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [width, height, isInitialized]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      {/* Performance indicator */}
      {config.nodeEnv === 'development' && isInitialized && (
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono z-10">
          <div>FPS: {fps}</div>
          <div>Quality: {quality}</div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="border border-slate-200 rounded-lg shadow-sm w-full h-full game-canvas"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          // Light, neutral canvas background
          backgroundColor: '#f5f7fb',
          minHeight: '400px'
        }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center text-slate-700">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-300 mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="text-lg font-medium mb-2">Preparing the Map</div>
            <div className="text-sm text-slate-500">Loading renderer…</div>
            <div className="mt-4 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}
      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="mb-4">
              <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-red-700 mb-2">Canvas Failed to Load</h3>
            <p className="text-sm text-red-600 mb-4">{initError}</p>
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

// Export types for external use
export type { GameCanvasProps };
