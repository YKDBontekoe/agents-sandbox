"use client";

import { createContext, useContext, ReactNode } from "react";
import { Viewport } from "pixi-viewport";
import * as PIXI from "pixi.js";

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
  console.log('GameProvider rendering with:', { app: !!app, viewport: !!viewport });
  
  return (
    <GameContext.Provider value={{ app, viewport, setApp, setViewport }}>
      {children}
    </GameContext.Provider>
  );
}