"use client";

import { createContext, useContext, ReactNode } from "react";
import { Viewport } from "pixi-viewport";
import type { Application } from "pixi.js";

interface GameContextType {
  app: Application | null;
  viewport: Viewport | null;
  setApp: (app: Application | null) => void;
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
  app: Application | null;
  viewport: Viewport | null;
  setApp: (app: Application | null) => void;
  setViewport: (viewport: Viewport | null) => void;
}

export function GameProvider({
  children,
  app,
  viewport,
  setApp,
  setViewport,
}: GameProviderProps) {
  return (
    <GameContext.Provider value={{ app, viewport, setApp, setViewport }}>
      {children}
    </GameContext.Provider>
  );
}