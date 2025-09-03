import React from 'react';
import { HUDSystemExample } from '@/components/game/hud/IntegratedHUDSystem';
import Head from 'next/head';

export default function HUDDemoPage() {
  return (
    <>
      <Head>
        <title>HUD System Demo - Scalable Layout System</title>
        <meta name="description" content="Demonstration of the scalable HUD layout system with responsive design and modular components" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <HUDSystemExample />
      </div>
    </>
  );
}