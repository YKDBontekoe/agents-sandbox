import React, { useMemo, useState, useEffect } from 'react';
import { ResponsivePanel, ResponsiveButton } from '@arcane/ui/responsive';
import { useHUDPanel } from '../HUDPanelRegistry';
import MiniMap from '../../MiniMap';
import { useGameContext } from '../../GameContext';
import { useHUDLayout } from '../HUDLayoutSystem';

export interface MiniMapDescriptor {
  gridSize: number;
  tileWidth?: number;
  tileHeight?: number;
}

type NormalizedMiniMapDescriptor = {
  gridSize: number;
  tileWidth: number;
  tileHeight: number;
};

interface ModularMiniMapPanelProps {
  map?: MiniMapDescriptor;
  width?: number;
  height?: number;
  variant?: 'default' | 'compact' | 'minimal';
  collapsible?: boolean;
}

export function ModularMiniMapPanel({
  map,
  width = 180,
  height = 132,
  variant = 'compact',
  collapsible = true,
}: ModularMiniMapPanelProps) {
  const normalizedMap = useMemo<NormalizedMiniMapDescriptor>(() => {
    if (map) {
      return {
        gridSize: map.gridSize,
        tileWidth: map.tileWidth ?? 64,
        tileHeight: map.tileHeight ?? 32,
      };
    }

    return {
      gridSize: 20,
      tileWidth: 64,
      tileHeight: 32,
    };
  }, [map]);

  const { gridSize, tileWidth, tileHeight } = normalizedMap;

  // Register this panel in the right sidebar
  useHUDPanel({
    config: {
      id: 'mini-map',
      zone: 'sidebar-right',
      priority: 7,
      responsive: {
        hideOnMobile: true,
      },
      accessibility: {
        ariaLabel: 'Mini map overview',
        role: 'region',
      },
    },
    component: ModularMiniMapPanel,
    props: { map: normalizedMap, width, height, variant, collapsible },
  });

  const { viewport } = useGameContext();
  const [followSelection, setFollowSelection] = useState(false);
  const { screenSize } = useHUDLayout();

  const handleRecenter = () => {
    if (!viewport) return;
    const midY = (gridSize - 1) * (tileHeight / 2);
    viewport.moveCenter(0, midY);
    viewport.setZoom(1.2);
  };

  useEffect(() => {
    const onSelect = (e: any) => {
      if (!followSelection || !viewport) return;
      try {
        const detail = e.detail || {};
        const { gridX, gridY } = detail;
        if (typeof gridX !== 'number' || typeof gridY !== 'number') return;
        const detailTileWidth = detail.tileWidth ?? tileWidth;
        const detailTileHeight = detail.tileHeight ?? tileHeight;
        const wx = (gridX - gridY) * (detailTileWidth / 2);
        const wy = (gridX + gridY) * (detailTileHeight / 2);
        viewport.moveCenter(wx, wy);
      } catch {}
    };
    window.addEventListener('ad_select_tile', onSelect as any);
    return () => window.removeEventListener('ad_select_tile', onSelect as any);
  }, [followSelection, viewport, tileWidth, tileHeight]);

  const dims = useMemo(() => {
    // Slightly smaller map for compact/minimal
    if (variant === 'minimal') return { w: 140, h: 104 };
    if (variant === 'compact') return { w: 168, h: 124 };
    return { w: width, h: height };
  }, [variant, width, height]);

  return (
    <ResponsivePanel
      screenSize={screenSize}
      title={variant === 'minimal' ? 'Map' : 'Mini Map'}
      icon={(
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20l-5-2-4 2-5-2V4l5 2 4-2 5 2v16z" />
        </svg>
      )}
      variant={variant}
      collapsible={collapsible}
      priority="medium"
      className="min-w-0"
    >
      <div className="flex items-start gap-3">
        <div className="rounded border border-gray-700 overflow-hidden shadow-sm">
          <MiniMap gridSize={gridSize} tileWidth={tileWidth} tileHeight={tileHeight} width={dims.w} height={dims.h} />
        </div>
        {variant !== 'minimal' && (
          <div className="flex flex-col gap-2">
            <ResponsiveButton
              screenSize={screenSize}
              onClick={handleRecenter}
              variant="secondary"
              size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
            >
              Recenter
            </ResponsiveButton>
            <ResponsiveButton
              screenSize={screenSize}
              onClick={() => setFollowSelection((v: boolean) => !v)}
              variant={followSelection ? 'primary' : 'secondary'}
              size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
            >
              {followSelection ? 'Following' : 'Follow Sel.'}
            </ResponsiveButton>
            <ResponsiveButton
              screenSize={screenSize}
              onClick={() => viewport?.setZoom((viewport.scale.x || 1) * 1.1, true)}
              variant="secondary"
              size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
            >
              Zoom +
            </ResponsiveButton>
            <ResponsiveButton
              screenSize={screenSize}
              onClick={() => viewport?.setZoom((viewport.scale.x || 1) * 0.9, true)}
              variant="secondary"
              size={{ mobile: 'xs', tablet: 'xs', desktop: 'sm', wide: 'sm' }}
            >
              Zoom -
            </ResponsiveButton>
          </div>
        )}
      </div>
    </ResponsivePanel>
  );
}

export default ModularMiniMapPanel;
