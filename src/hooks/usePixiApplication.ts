import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { useGameContext } from "@/components/game/GameContext";
import logger from "@/lib/logger";

interface UsePixiApplicationOptions {
  width: number;
  height: number;
}

interface UsePixiApplicationResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  app: PIXI.Application | null;
  viewport: Viewport | null;
  isInitialized: boolean;
  initError: string | null;
}

/**
 * Sets up a PIXI application and viewport tied to a canvas element.
 * Handles WebGL context loss, fallback initialization and cleanup.
 */
export function usePixiApplication({
  width,
  height,
}: UsePixiApplicationOptions): UsePixiApplicationResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const contextLostHandlerRef = useRef<((event: Event) => void) | null>(null);
  const contextRestoredHandlerRef = useRef<((event: Event) => void) | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { setApp, setViewport } = useGameContext();

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    let cancelled = false;

    const initPixi = async () => {
      const initializeCanvas = async () => {
        const app = new PIXI.Application();
        const initOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0x111827,
          antialias: window.devicePixelRatio <= 1,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          hello: false,
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance" as const,
          premultipliedAlpha: false,
        };

        await app.init(initOptions);
        if (cancelled) return;

        const canvas = app.canvas as HTMLCanvasElement;
        contextLostHandlerRef.current = (event: Event) => {
          event.preventDefault();
          setInitError(
            "WebGL context lost. The game will attempt to restore automatically."
          );
        };
        contextRestoredHandlerRef.current = () => {
          setInitError(null);
          setIsInitialized(false);
          setTimeout(() => {
            if (canvasRef.current && !cancelled) {
              initPixi();
            }
          }, 100);
        };
        canvas.addEventListener(
          "webglcontextlost",
          contextLostHandlerRef.current
        );
        canvas.addEventListener(
          "webglcontextrestored",
          contextRestoredHandlerRef.current
        );

        app.ticker.maxFPS = 60;
        app.ticker.minFPS = 30;
        if (app.renderer.textureGC) {
          app.renderer.textureGC.maxIdle = 60 * 60;
          app.renderer.textureGC.checkCountMax = 600;
        }
        if ("batchSize" in app.renderer) {
          (app.renderer as PIXI.Renderer & { batchSize?: number }).batchSize =
            4096;
        }

        appRef.current = app;

        const viewport = new Viewport({
          screenWidth: width,
          screenHeight: height,
          worldWidth: 2000,
          worldHeight: 2000,
          events: app.renderer.events,
        });
        // Ensure pointer events are processed in Pixi v7+/v8
        (app.stage as any).eventMode = "static";
        (viewport as any).eventMode = "static";

        viewport.sortableChildren = true;
        app.stage.addChild(viewport);
        viewport
          .drag({ mouseButtons: "all" })
          .pinch()
          .decelerate({ friction: 0.92, bounce: 0.25, minSpeed: 0.02 })
          .clampZoom({ minScale: 0.2, maxScale: 3 })
          .wheel({ smooth: 0, percent: 0.12 });

        viewportRef.current = viewport;
        if (cancelled) return;
        setApp(app);
        setViewport(viewport);
        setIsInitialized(true);
        logger.debug("PIXI Application initialized successfully");
      };

      const initializeFallbackCanvas = async () => {
        const app = new PIXI.Application();
        const initOptions = {
          canvas: canvasRef.current!,
          width,
          height,
          backgroundColor: 0x111827,
          antialias: false,
          resolution: 1,
          autoDensity: true,
          hello: false,
          clearBeforeRender: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
          powerPreference: "high-performance" as const,
          premultipliedAlpha: false,
        };

        await app.init(initOptions);
        if (cancelled) return;

        const canvas = app.canvas as HTMLCanvasElement;
        contextLostHandlerRef.current = (event: Event) => {
          event.preventDefault();
          setInitError(
            "WebGL context lost. The game will attempt to restore automatically."
          );
        };
        contextRestoredHandlerRef.current = () => {
          setInitError(null);
          setIsInitialized(false);
          setTimeout(() => {
            if (canvasRef.current && !cancelled) {
              initPixi();
            }
          }, 100);
        };
        canvas.addEventListener(
          "webglcontextlost",
          contextLostHandlerRef.current
        );
        canvas.addEventListener(
          "webglcontextrestored",
          contextRestoredHandlerRef.current
        );

        app.ticker.maxFPS = 60;
        app.ticker.minFPS = 30;
        if (app.renderer.textureGC) {
          app.renderer.textureGC.maxIdle = 60 * 60;
          app.renderer.textureGC.checkCountMax = 600;
        }
        if ("batchSize" in app.renderer) {
          (app.renderer as PIXI.Renderer & { batchSize?: number }).batchSize =
            4096;
        }

        appRef.current = app;

        const viewport = new Viewport({
          screenWidth: width,
          screenHeight: height,
          worldWidth: 2000,
          worldHeight: 2000,
          events: app.renderer.events,
        });
        // Ensure pointer events are processed in Pixi v7+/v8
        (app.stage as any).eventMode = "static";
        (viewport as any).eventMode = "static";

        viewport.sortableChildren = true;
        app.stage.addChild(viewport);
        viewport
          .drag({ mouseButtons: "all" })
          .pinch()
          .decelerate({ friction: 0.92, bounce: 0.25, minSpeed: 0.02 })
          .clampZoom({ minScale: 0.2, maxScale: 3 })
          .wheel({ smooth: 0, percent: 0.12 });

        viewportRef.current = viewport;
        if (cancelled) return;
        setApp(app);
        setViewport(viewport);
        setIsInitialized(true);
        logger.debug("PIXI Fallback Application initialized successfully");
      };

      try {
        await initializeCanvas();
        if (cancelled) return;
      } catch (err) {
        logger.error("Failed to initialize game canvas:", err);
        try {
          await initializeFallbackCanvas();
          if (cancelled) return;
        } catch (fallbackError) {
          logger.error("Fallback initialization also failed:", fallbackError);
          setInitError(
            "Failed to initialize game canvas. Your browser may not support WebGL."
          );
          setIsInitialized(true);
        }
      }
    };

    initPixi();
    return () => {
      cancelled = true;
    };
  }, [width, height, isInitialized, setApp, setViewport]);

  useEffect(() => {
    return () => {
      if (appRef.current) {
        const canvas = appRef.current.canvas as HTMLCanvasElement;
        if (canvas) {
          if (contextLostHandlerRef.current) {
            canvas.removeEventListener(
              "webglcontextlost",
              contextLostHandlerRef.current
            );
          }
          if (contextRestoredHandlerRef.current) {
            canvas.removeEventListener(
              "webglcontextrestored",
              contextRestoredHandlerRef.current
            );
          }
        }
        if (viewportRef.current) {
          viewportRef.current.destroy({ children: true });
          viewportRef.current = null;
        }
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
      setApp(null);
      setViewport(null);
      setIsInitialized(false);
    };
  }, [setApp, setViewport]);

  useEffect(() => {
    const applySize = () => {
      if (appRef.current && viewportRef.current) {
        const renderer = appRef.current.renderer as any;
        const curW = renderer?.width ?? 0;
        const curH = renderer?.height ?? 0;
        if (curW !== width || curH !== height) {
          appRef.current.renderer.resize(width, height);
          viewportRef.current.resize(width, height);
        }
      }
    };
    applySize();
    // We rely on React-driven width/height updates; avoid extra window resize listeners here to prevent redundant resizes.
    return () => {
      // no-op
    };
  }, [width, height, isInitialized]);
  
  return {
    canvasRef,
    app: appRef.current,
    viewport: viewportRef.current,
    isInitialized,
    initError,
  };
}

export type { UsePixiApplicationOptions, UsePixiApplicationResult };
