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
  console.log('GameCanvas component mounted with props:', { width, height });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const contextLostHandlerRef = useRef<((event: Event) => void) | null>(null);
  const contextRestoredHandlerRef = useRef<((event: Event) => void) | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { setApp, setViewport } = useGameContext();

  useEffect(() => {
    console.log('GameCanvas useEffect triggered with width:', width, 'height:', height);
    console.log('Canvas ref available:', !!canvasRef.current);
    console.log('Is initialized:', isInitialized);
    
    if (!canvasRef.current) {
      console.error('Canvas ref is not available!');
      return;
    }
    
    if (isInitialized) {
      console.log('Canvas already initialized, skipping');
      return;
    }

    const initPixi = async () => {
        const initializeCanvas = async () => {
          console.log('Starting PIXI initialization...');
        // Enhanced WebGL support check
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl') as WebGLRenderingContext | WebGL2RenderingContext | null;
        
        if (!gl) {
          throw new Error('WebGL is not supported by your browser. Please enable hardware acceleration or use a modern browser.');
        }

        // Test WebGL functionality
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          console.log('WebGL Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
        
        // Create PIXI Application with enhanced fallback options
        const app = new PIXI.Application();
        
        // Performance-optimized initialization options
        const initOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0x1a1a2e,
          antialias: window.devicePixelRatio <= 1, // Disable on high-DPI for performance
          resolution: Math.min(window.devicePixelRatio || 1, 2), // Cap at 2x for performance
          autoDensity: true,
          preference: 'webgl' as const, // Use WebGL preference with WebGL2 fallback
          powerPreference: 'high-performance' as const,
          hello: false, // Disable PIXI banner in console
          // Performance optimizations
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false, // Allow fallback to software rendering
        };
        
        await app.init(initOptions);

        // Add WebGL context loss handling
        const canvas = app.canvas as HTMLCanvasElement;
        
        contextLostHandlerRef.current = (event: Event) => {
          console.warn('WebGL context lost, preventing default behavior');
          event.preventDefault();
          setInitError('WebGL context lost. The game will attempt to restore automatically.');
        };
        
        contextRestoredHandlerRef.current = () => {
          console.log('WebGL context restored, reinitializing...');
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

        // Performance optimizations
        app.ticker.maxFPS = 60; // Cap frame rate for consistent performance
        app.ticker.minFPS = 30; // Minimum acceptable frame rate
        
        // Enable texture garbage collection (modern PIXI.js API)
        if (app.renderer.textureGC) {
          app.renderer.textureGC.maxIdle = 60 * 60; // 1 minute idle time
        }
        
        // Optimize rendering performance settings are handled in init options
        
        // Set up performance monitoring
        let lastTime = performance.now();
        app.ticker.add(() => {
          const currentTime = performance.now();
          const deltaTime = currentTime - lastTime;
          
          // Skip frame if performance is poor
          if (deltaTime > 33.33) { // More than 30fps threshold
            return;
          }
          
          lastTime = currentTime;
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

        // Add a test graphic to verify rendering
        const testGraphic = new PIXI.Graphics();
        testGraphic.fill({ color: 0xff0000, alpha: 0.8 });
        testGraphic.rect(0, 0, 100, 100);
        testGraphic.fill();
        testGraphic.x = 500;
        testGraphic.y = 500;
        viewport.addChild(testGraphic);
        console.log('Added test red rectangle at (500, 500)');

        // Share references through context
        setApp(app);
        setViewport(viewport);

        setIsInitialized(true);
        console.log('PIXI Application initialized successfully');
        console.log('App canvas dimensions:', app.canvas.width, 'x', app.canvas.height);
        console.log('Viewport world size:', viewport.worldWidth, 'x', viewport.worldHeight);
        console.log('Viewport position:', viewport.x, viewport.y);
        console.log('Viewport scale:', viewport.scale.x, viewport.scale.y);
      };

      const initializeFallbackCanvas = async () => {
        console.log('Initializing fallback canvas with reduced settings...');
        
        const app = new PIXI.Application();
        
        const fallbackOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0x1a1a2e,
          antialias: false,
          resolution: 1,
          autoDensity: false,
          preference: 'webgl' as const,
          powerPreference: 'low-power' as const,
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
        viewport.drag({ mouseButtons: "left" }).wheel();
        viewport.moveCenter(1000, 1000);
        viewport.setZoom(0.8);
        
        setApp(app);
        setViewport(viewport);
        setIsInitialized(true);
        console.log('Fallback canvas initialized successfully');
      };

      try {
        await initializeCanvas();
      } catch (error) {
        console.error('Failed to initialize game canvas:', error);
        
        // Try fallback initialization with reduced settings
        try {
          console.log('Attempting fallback canvas initialization...');
          await initializeFallbackCanvas();
        } catch (fallbackError) {
          console.error('Fallback initialization also failed:', fallbackError);
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown WebGL error';
          setInitError('Failed to initialize game canvas. Your browser may not support WebGL.');
          setIsInitialized(true); // Set to true to stop loading state
          
          // Provide helpful error messages based on common issues
          if (errorMessage.includes('WebGL')) {
            console.warn('WebGL initialization failed. This may be due to:');
            console.warn('- Hardware acceleration disabled');
            console.warn('- Outdated graphics drivers');
            console.warn('- Browser security settings');
          }
        }
      }
    };

    initPixi();
  }, [width, height, isInitialized]);

  // Enhanced cleanup with memory management
  useEffect(() => {
    return () => {
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
        
        // Stop all tickers and animations
        appRef.current.ticker.stop();
        appRef.current.ticker.destroy();
        
        // Clean up viewport
        if (viewportRef.current) {
          viewportRef.current.destroy({ children: true });
          viewportRef.current = null;
        }
        
        // Destroy application with comprehensive cleanup
        appRef.current.destroy(true, {
          children: true,
          texture: true,
        });
        
        // Force garbage collection of textures
        if (appRef.current.renderer?.textureGC) {
          appRef.current.renderer.textureGC.run();
        }
        
        appRef.current = null;
      }
      
      // Reset state
      setApp(null);
      setViewport(null);
      setIsInitialized(false);
    };
  }, []);

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
    <div className="relative" style={{ minHeight: '400px', border: '2px solid red' }}>
      <canvas
        ref={canvasRef}
        className="border border-slate-700 rounded-lg"
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
          backgroundColor: '#1a1a2e',
          minHeight: '400px'
        }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-lg">
          <div className="text-center text-gray-300">
            <div className="relative mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-600 mx-auto"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-400 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="text-lg font-medium mb-2">Initializing Game Canvas</div>
            <div className="text-sm text-gray-400">Loading WebGL renderer...</div>
            <div className="mt-4 flex justify-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}
      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="mb-4">
              <svg className="w-12 h-12 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-red-300 mb-2">Game Initialization Failed</h3>
            <p className="text-sm text-red-200 mb-4">{initError}</p>
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