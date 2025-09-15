"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { Viewport } from "pixi-viewport";
import * as PIXI from "pixi.js";
import logger from "@/lib/logger";

interface GameContextType {
  app: PIXI.Application | null;
  viewport: Viewport | null;
  setApp: (app: PIXI.Application | null) => void;
  setViewport: (viewport: Viewport | null) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
}

interface GameProviderProps {
  children: ReactNode;
  app: PIXI.Application | null;
  viewport: Viewport | null;
  setApp: (app: PIXI.Application | null) => void;
  setViewport: (viewport: Viewport | null) => void;
}

export function GameProvider({
  children,
  app,
  viewport,
  setApp,
  setViewport,
}: GameProviderProps) {
  logger.debug("GameProvider rendering with:", { app: !!app, viewport: !!viewport });
  
  const value = useMemo(() => ({ app, viewport, setApp, setViewport }), [app, viewport, setApp, setViewport]);
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}