import React, { useState } from 'react';
import { HUDSystemExample } from '@/components/game/hud/IntegratedHUDSystem';
import { GameProvider } from '@/components/game/GameContext';
import Head from 'next/head';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export default function HUDDemoPage() {
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);

  return (
    <>
      <Head>
        <title>HUD System Demo - Scalable Layout System</title>
        <meta name="description" content="Demonstration of the scalable HUD layout system with responsive design and modular components" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <GameProvider app={app} viewport={viewport} setApp={setApp} setViewport={setViewport}>
          <HUDSystemExample />
        </GameProvider>
      </div>
    </>
  );
}