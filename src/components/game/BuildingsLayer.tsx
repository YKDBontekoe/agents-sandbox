"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import { getBuildingSpriteUrl, getBuildingSpriteCandidates } from "./buildingAssets";
import { SIM_BUILDINGS } from "./simCatalog";
import type { SimpleBuilding } from "./types";
import drawCouncilHall from "./buildingIcons/councilHall";
import drawTradePost from "./buildingIcons/tradePost";
import drawAutomationWorkshop from "./buildingIcons/automationWorkshop";
import drawFarm from "./buildingIcons/farm";
import drawLumberCamp from "./buildingIcons/lumberCamp";
import drawSawmill from "./buildingIcons/sawmill";
import drawStorehouse from "./buildingIcons/storehouse";
import drawShrine from "./buildingIcons/shrine";
import drawHouse from "./buildingIcons/house";
import drawDefaultIcon from "./buildingIcons/default";

interface BuildingsLayerProps {
  buildings: SimpleBuilding[];
  tileWidth?: number;
  tileHeight?: number;
  storeConnectedIds?: string[];
  selected?: { x: number; y: number } | null;
}

const ICON_DRAWERS: Record<string, (g: PIXI.Graphics, tw: number, th: number) => void> = {
  council_hall: drawCouncilHall,
  trade_post: drawTradePost,
  automation_workshop: drawAutomationWorkshop,
  farm: drawFarm,
  lumber_camp: drawLumberCamp,
  sawmill: drawSawmill,
  storehouse: drawStorehouse,
  shrine: drawShrine,
  house: drawHouse,
};

function drawIcon(g: PIXI.Graphics, typeId: string, tw: number, th: number) {
  g.clear();
  // subtle base shadow
  g.beginFill(0x111827, 0.08);
  g.drawPolygon([
    0, -th / 2,
    tw / 2, 0,
    0, th / 2,
    -tw / 2, 0,
  ]);
  g.endFill();

  const drawer = ICON_DRAWERS[typeId] ?? drawDefaultIcon;
  drawer(g, tw, th);
}

function getPipColor(typeId: string): number {
  // Choose a representative color for the building's primary output
  switch (typeId) {
    case 'farm': return 0x16a34a; // grain - green
    case 'lumber_camp': return 0x92400e; // wood - brown
    case 'sawmill': return 0xf59e0b; // planks - orange
    case 'trade_post': return 0xfbbf24; // coin - gold
    case 'automation_workshop': return 0xfbbf24; // coin - gold
    case 'shrine': return 0x7c3aed; // favor - purple
    case 'council_hall': return 0x7c3aed; // favor - purple
    case 'house': return 0x9f1239; // workers - red accent
    case 'storehouse': return 0x334155; // neutral
    default: return 0x22c55e; // default green
  }
}

export default function BuildingsLayer({ buildings, tileWidth = 64, tileHeight = 32, storeConnectedIds = [], selected }: BuildingsLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const labelsRef = useRef<Map<string, PIXI.Text>>(new Map());
  const miniOutRef = useRef<Map<string, PIXI.Text>>(new Map());
  const tooltipRef = useRef<PIXI.Container | null>(null);
  const tooltipTextRef = useRef<PIXI.Text | null>(null);
  const storeLinked = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!viewport) return;
    const container = new PIXI.Container();
    container.name = 'buildings-layer';
    container.sortableChildren = true;
    container.zIndex = 500; // render above base grid
    viewport.addChild(container);
    containerRef.current = container;

    // create shared tooltip container
    const tip = new PIXI.Container();
    tip.visible = false;
    tip.zIndex = 9999;
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, 10, 10, 4);
    bg.fill({ color: 0xffffff, alpha: 0.95 });
    bg.stroke({ width: 1, color: 0x94a3b8, alpha: 1 });
    tip.addChild(bg);
    const txt = new PIXI.Text({
      text: '',
      style: new PIXI.TextStyle({ fontSize: 11, fill: 0x0f172a, fontFamily: 'ui-sans-serif, system-ui' }),
    });
    txt.position.set(6, 4);
    tip.addChild(txt);
    container.addChild(tip);
    tooltipRef.current = tip;
    tooltipTextRef.current = txt;

    return () => {
      if (container.parent) {
        container.parent.removeChild(container);
      }
      container.destroy({ children: true });
      containerRef.current = null;
      labelsRef.current.clear();
      miniOutRef.current.clear();
      tooltipRef.current = null;
      tooltipTextRef.current = null;
    };
  }, [viewport]);

  // Track existing building sprites to avoid recreating them
  const buildingSpritesRef = useRef<Map<string, PIXI.Container>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // Update store connected IDs
    storeLinked.current = new Set(storeConnectedIds);

    // Clear label/text refs; we'll rebuild them each pass
    labelsRef.current.clear();
    miniOutRef.current.clear();

    // Get current building IDs
    const currentBuildingIds = new Set(buildings.map(b => b.id));
    const existingBuildingIds = new Set(buildingSpritesRef.current.keys());

    // Remove buildings that no longer exist
    for (const buildingId of existingBuildingIds) {
      if (!currentBuildingIds.has(buildingId)) {
        const buildingContainer = buildingSpritesRef.current.get(buildingId);
        if (buildingContainer) {
          container.removeChild(buildingContainer);
          buildingContainer.destroy({ children: true });
          buildingSpritesRef.current.delete(buildingId);
        }
      }
    }

    const showTooltip = (text: string, x: number, y: number, dotColor?: number) => {
      const tip = tooltipRef.current;
      const txt = tooltipTextRef.current;
      if (!tip || !txt) return;
      // remove previous dot if present
      const prevDot = tip.getChildByName('res-dot');
      if (prevDot) prevDot.destroy();
      txt.text = text;
      const padX = 8, padY = 6;
      const w = Math.max(40, txt.width + padX * 2);
      const h = Math.max(18, txt.height + padY * 2);
      const bg = tip.children[0] as PIXI.Graphics;
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0xffffff, alpha: 0.95 });
      bg.stroke({ width: 1, color: 0x94a3b8, alpha: 1 });
      txt.position.set(padX, padY - 2);
      if (dotColor) {
        const dot = new PIXI.Graphics();
        dot.name = 'res-dot';
        dot.beginFill(dotColor, 0.95);
        dot.drawCircle(0, 0, 3);
        dot.endFill();
        dot.position.set(padX + 6, padY + 10);
        tip.addChild(dot);
      }
      tip.position.set(x - w/2, y - h - 6);
      tip.visible = true;
    };
    const hideTooltip = () => { if (tooltipRef.current) tooltipRef.current.visible = false; };

    // Create or update buildings incrementally (now rebuilding container content each run to avoid stacking)
    buildings.forEach((b) => {
      const { worldX, worldY } = gridToWorld(b.x, b.y, tileWidth, tileHeight);
      const simDef = SIM_BUILDINGS[b.typeId as keyof typeof SIM_BUILDINGS];
      
      // Fetch or create building container
      let buildingContainer = buildingSpritesRef.current.get(b.id);
      if (!buildingContainer) {
        buildingContainer = new PIXI.Container();
        buildingContainer.name = `building-${b.id}`;
        buildingContainer.sortableChildren = true;
        buildingSpritesRef.current.set(b.id, buildingContainer);
        container.addChild(buildingContainer);
      } else {
        // Clear previous dynamic children to prevent overlap/duplication
        buildingContainer.removeChildren();
      }
      
      // Selection glow under the building footprint if selected tile matches
      if (selected && selected.x === b.x && selected.y === b.y && buildingContainer) {
        const glow = new PIXI.Graphics();
        glow.position.set(worldX, worldY);
        glow.zIndex = 509;
        glow.beginFill(0x22c55e, 0.18);
        glow.drawEllipse(0, 0, tileWidth * 0.32, tileHeight * 0.26);
        glow.endFill();
        glow.setStrokeStyle({ width: 2, color: 0x10b981, alpha: 0.7 });
        glow.drawEllipse(0, 0, tileWidth * 0.34, tileHeight * 0.28);
        glow.stroke();
        buildingContainer.addChild(glow);
      }
      const url = getBuildingSpriteUrl(b.typeId);
      if (url) {
        // subtle shadow for contrast
        const shadow = new PIXI.Graphics();
        shadow.position.set(worldX, worldY + 2);
        shadow.zIndex = 515;
        shadow.beginFill(0x000000, 0.12);
        shadow.drawEllipse(0, 0, tileWidth * 0.22, tileHeight * 0.18);
        shadow.endFill();

        // low-zoom friendly diamond outline
        const frame = new PIXI.Graphics();
        frame.position.set(worldX, worldY);
        frame.zIndex = 518;
        frame.lineStyle(1.5, 0x475569, 0.9);
        frame.moveTo(0, -tileHeight/2);
        frame.lineTo(tileWidth/2, 0);
        frame.lineTo(0, tileHeight/2);
        frame.lineTo(-tileWidth/2, 0);
        frame.lineTo(0, -tileHeight/2);

        const spr = new PIXI.Sprite();
        spr.anchor.set(0.5);
        spr.position.set(worldX, worldY - tileHeight * 0.06);
        spr.zIndex = 520;
        spr.eventMode = 'static';
        spr.cursor = 'pointer';
        spr.visible = false;
        // Prevent viewport drag from swallowing clicks on sprites
        spr.on('pointerdown', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        spr.on('pointerup', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        spr.on('pointerupoutside', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        // Scale to roughly fit within a tile diamond
        const targetW = tileWidth * 0.7;
        const targetH = tileHeight * 1.05;
        const applyScale = () => {
          const bw = spr.texture?.width || 64;
          const bh = spr.texture?.height || 64;
          const sx = targetW / bw;
          const sy = targetH / bh;
          const s = Math.min(sx, sy);
          spr.scale.set(s);
        };
        // initial scale (may use placeholder size); Assets.load will re-call
        applyScale();
        // Load via PIXI.Assets to support SVG dimensions and caching reliably
        const candidates = getBuildingSpriteCandidates(b.typeId, Math.max(1, Number(b.level ?? 1)));
        (async () => {
          let loadedTex: PIXI.Texture | null = null;
          for (const candidateUrl of candidates) {
            try {
              const tex = await PIXI.Assets.load(candidateUrl);
              if (tex) { loadedTex = tex as PIXI.Texture; break; }
            } catch {}
          }
          if (!loadedTex) {
            // final fallback to base url
            try {
              const baseTex = await PIXI.Assets.load(url);
              loadedTex = baseTex as PIXI.Texture;
            } catch {}
          }
          if (loadedTex) {
            spr.texture = loadedTex;
            spr.visible = true;
            try { applyScale(); } catch {}
          } else {
            // If loading fails, draw vector fallback icon
            spr.visible = false;
            const fallbackIcon = new PIXI.Graphics();
            fallbackIcon.position.set(worldX, worldY);
            fallbackIcon.zIndex = 520;
            drawIcon(fallbackIcon, b.typeId, tileWidth, tileHeight);
            if (buildingContainer) buildingContainer.addChild(fallbackIcon);
          }
        })();
        spr.on('pointerover', () => {
          const nm = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
          const lvl = Math.max(1, Number(b.level ?? 1));
          const workers = Number(b.workers ?? 0);
          const capBase = SIM_BUILDINGS[b.typeId]?.workCapacity ?? 0;
          const cap = Math.round(capBase * (1 + 0.25 * (lvl - 1)));
          // predicted output
          const outs = simDef?.outputs || {};
          const pairs = Object.entries(outs).filter(([,v]) => (v as number) > 0) as Array<[string, number]>;
          let extra = '';
          let color: number | undefined = undefined;
          if (pairs.length) {
            pairs.sort((a,b)=> (b[1]||0)-(a[1]||0));
            const base = pairs[0][1] as number;
            const ratio = cap>0 ? Math.min(1, workers / cap) : 1;
            const out = Math.max(0, Math.round(base * ratio * (1 + 0.5 * (lvl - 1))));
            const key = String(pairs[0][0]);
            extra = `\n≈ +${out} ${key}`;
            const cmap: Record<string, number> = { grain: 0x16a34a, wood: 0x92400e, planks: 0xf59e0b, coin: 0xfbbf24, favor: 0x7c3aed, mana: 0x2563eb };
            color = cmap[key] ?? 0x475569;
          }
          showTooltip(`${nm} • Lv.${lvl}\nWorkers ${workers}/${cap}${extra}`, worldX, worldY - tileHeight * 0.9, color);
          try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: b.id } })); } catch {}
        });
        spr.on('pointerout', () => { hideTooltip(); try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: null } })); } catch {} });
        // double-click to start route for storehouse/trade_post
        let lastTap = 0;
        spr.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          // right-click context
          if (e && typeof e.button === 'number' && e.button === 2) {
            try { window.dispatchEvent(new CustomEvent('ad_show_building_menu', { detail: { buildingId: b.id, screenX: e.globalX, screenY: e.globalY } })); } catch {}
            return;
          }
        });
        spr.on('pointertap', () => {
          const now = Date.now();
          try { window.dispatchEvent(new CustomEvent('ad_building_tap', { detail: { buildingId: b.id } })); } catch {}
          if (now - lastTap < 300 && (b.typeId === 'storehouse' || b.typeId === 'trade_post')) {
            try { window.dispatchEvent(new CustomEvent('ad_start_route', { detail: { buildingId: b.id } })); } catch {}
          }
          lastTap = now;
        });
        // scaling utilities are defined above
        if (buildingContainer) {
          buildingContainer.addChild(shadow);
          buildingContainer.addChild(frame);
          buildingContainer.addChild(spr);
        }

        // Always-on invisible hit area covering the tile diamond for reliable clicks
        const hit = new PIXI.Graphics();
        hit.position.set(worldX, worldY);
        hit.zIndex = 540; // above label, but transparent
        hit.eventMode = 'static';
        hit.cursor = 'pointer';
        hit.alpha = 0.001; // keep in scene graph but visually invisible
        hit.beginFill(0x000000, 1);
        hit.moveTo(0, -tileHeight/2);
        hit.lineTo(tileWidth/2, 0);
        hit.lineTo(0, tileHeight/2);
        hit.lineTo(-tileWidth/2, 0);
        hit.lineTo(0, -tileHeight/2);
        hit.endFill();
        hit.on('pointerdown', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        hit.on('pointerup', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        hit.on('pointerupoutside', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        hit.on('pointertap', () => {
          try { window.dispatchEvent(new CustomEvent('ad_building_tap', { detail: { buildingId: b.id } })); } catch {}
          try { window.dispatchEvent(new CustomEvent('ad_select_tile', { detail: { gridX: b.x, gridY: b.y, tileWidth, tileHeight } })); } catch {}
        });
        hit.on('pointerover', () => {
          const nm = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
          const lvl = Math.max(1, Number(b.level ?? 1));
          const workers = Number(b.workers ?? 0);
          const capBase = SIM_BUILDINGS[b.typeId]?.workCapacity ?? 0;
          const cap = Math.round(capBase * (1 + 0.25 * (lvl - 1)));
          const outs = simDef?.outputs || {};
          const pairs = Object.entries(outs).filter(([,v]) => (v as number) > 0) as Array<[string, number]>;
          let extra = '';
          let color: number | undefined = undefined;
          if (pairs.length) {
            pairs.sort((a,b)=> (b[1]||0)-(a[1]||0));
            const base = pairs[0][1] as number;
            const ratio = cap>0 ? Math.min(1, workers / cap) : 1;
            const out = Math.max(0, Math.round(base * ratio * (1 + 0.5 * (lvl - 1))));
            const key = String(pairs[0][0]);
            extra = `\n≈ +${out} ${key}`;
            const cmap: Record<string, number> = { grain: 0x16a34a, wood: 0x92400e, planks: 0xf59e0b, coin: 0xfbbf24, favor: 0x7c3aed, mana: 0x2563eb };
            color = cmap[key] ?? 0x475569;
          }
          showTooltip(`${nm} • Lv.${lvl}\nWorkers ${workers}/${cap}${extra}`, worldX, worldY - tileHeight * 0.9, color);
        });
        hit.on('pointerout', () => { if (tooltipRef.current) tooltipRef.current.visible = false; });
        hit.on('rightdown', (e: PIXI.FederatedPointerEvent) => {
          try { window.dispatchEvent(new CustomEvent('ad_show_building_menu', { detail: { buildingId: b.id, screenX: e.globalX, screenY: e.globalY } })); } catch {}
        });
        if (buildingContainer) buildingContainer.addChild(hit);

        // Building label (name), shown on higher zoom only
        const labelText = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
        const lbl = new PIXI.Text({
          text: labelText,
          style: new PIXI.TextStyle({
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
            fontSize: 10,
            fill: 0x1f2937,
            stroke: { color: 0xffffff, width: 3, join: 'round' },
          }),
        });
        lbl.anchor.set(0.5, 0);
        lbl.position.set(worldX, worldY - tileHeight * 0.9);
        lbl.zIndex = 530;
        lbl.eventMode = 'static';
        lbl.cursor = 'pointer';
        lbl.on('pointerdown', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        lbl.on('pointerup', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        lbl.on('pointerupoutside', (e: PIXI.FederatedPointerEvent) => { e.stopPropagation(); });
        lbl.on('pointertap', () => {
          try {
            window.dispatchEvent(new CustomEvent('ad_select_tile', { detail: { gridX: b.x, gridY: b.y, tileWidth, tileHeight } }));
          } catch {}
        });
        lbl.on('pointerover', () => {
          const nm = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
          const lvl = Math.max(1, Number(b.level ?? 1));
          const workers = Number(b.workers ?? 0);
          const capBase = SIM_BUILDINGS[b.typeId]?.workCapacity ?? 0;
          const cap = Math.round(capBase * (1 + 0.25 * (lvl - 1)));
          const outs = simDef?.outputs || {};
          const pairs = Object.entries(outs).filter(([,v]) => (v as number) > 0) as Array<[string, number]>;
          let extra = '';
          let color: number | undefined = undefined;
          if (pairs.length) {
            pairs.sort((a,b)=> (b[1]||0)-(a[1]||0));
            const base = pairs[0][1] as number;
            const ratio = cap>0 ? Math.min(1, workers / cap) : 1;
            const out = Math.max(0, Math.round(base * ratio * (1 + 0.5 * (lvl - 1))));
            const key = String(pairs[0][0]);
            extra = `\n≈ +${out} ${key}`;
            const cmap: Record<string, number> = { grain: 0x16a34a, wood: 0x92400e, planks: 0xf59e0b, coin: 0xfbbf24, favor: 0x7c3aed, mana: 0x2563eb };
            color = cmap[key] ?? 0x475569;
          }
          showTooltip(`${nm} • Lv.${lvl}\nWorkers ${workers}/${cap}${extra}`, worldX, worldY - tileHeight * 0.9, color);
          try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: b.id } })); } catch {}
        });
        lbl.on('pointerout', () => { hideTooltip(); try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: null } })); } catch {} });
        // double-click on label
        let lastTapLbl = 0;
        lbl.on('pointertap', () => {
          const now = Date.now();
          try { window.dispatchEvent(new CustomEvent('ad_building_tap', { detail: { buildingId: b.id } })); } catch {}
          if (now - lastTapLbl < 300 && (b.typeId === 'storehouse' || b.typeId === 'trade_post')) {
            try { window.dispatchEvent(new CustomEvent('ad_start_route', { detail: { buildingId: b.id } })); } catch {}
          }
          lastTapLbl = now;
        });
        lbl.on('rightdown', (e: PIXI.FederatedPointerEvent) => {
          try { window.dispatchEvent(new CustomEvent('ad_show_building_menu', { detail: { buildingId: b.id, screenX: e.globalX, screenY: e.globalY } })); } catch {}
        });
        if (buildingContainer) buildingContainer.addChild(lbl);
        labelsRef.current.set(b.id, lbl);

        // Logistics badge
        if (storeLinked.current.has(b.id) && (b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill')) {
          const badge = new PIXI.Container();
          badge.eventMode = 'static';
          badge.cursor = 'help';
          badge.position.set(worldX + tileWidth * 0.32, worldY - tileHeight * 0.95);
          badge.zIndex = 531;
          const bg2 = new PIXI.Graphics();
          bg2.beginFill(0x083344, 0.9);
          bg2.drawRoundedRect(-14, -10, 28, 16, 3);
          bg2.endFill();
          bg2.lineStyle(1, 0x06b6d4, 1);
          bg2.drawRoundedRect(-14, -10, 28, 16, 3);
          badge.addChild(bg2);
          const link = new PIXI.Graphics();
          link.lineStyle(2, 0x06b6d4, 1);
          link.moveTo(-8, -3); link.lineTo(-4, 1); link.lineTo(0, -3);
          badge.addChild(link);
          const txt = new PIXI.Text({ text: '+15%', style: new PIXI.TextStyle({ fontSize: 9, fill: 0x67e8f9, fontFamily: 'ui-sans-serif, system-ui' }) });
          txt.anchor.set(0, 0.5);
          txt.position.set(2, -2);
          badge.addChild(txt);
          badge.on('pointerover', () => { showTooltip('Logistics: +15% output', badge.position.x, badge.position.y, 0x06b6d4); });
          badge.on('pointerout', () => hideTooltip());
          if (buildingContainer) buildingContainer.addChild(badge);
        }

        // Mini output (approx) below label
        try {
          const defOut = simDef?.outputs || {};
          const pairs = Object.entries(defOut).filter(([,v]) => (v as number) > 0) as Array<[string, number]>;
          if (pairs.length) {
            pairs.sort((a,b)=> (b[1]||0) - (a[1]||0));
            const base = pairs[0][1] as number;
            const capBase = simDef?.workCapacity ?? 0;
            const lvl = Math.max(1, Number(b.level ?? 1));
            const cap = Math.round(capBase * (1 + 0.25 * (lvl - 1)));
            const ratio = cap > 0 ? Math.min(1, (Number(b.workers || 0)) / cap) : 1;
            const out = Math.max(0, Math.round(base * ratio * (1 + 0.5 * (lvl - 1))));
            const resKey = String(pairs[0][0]);
            const mini = new PIXI.Text({ text: `≈ +${out} ${resKey}`, style: new PIXI.TextStyle({ fontSize: 10, fill: 0x64748b, fontFamily: 'ui-sans-serif, system-ui', stroke: { color: 0xffffff, width: 3 } }) });
            mini.anchor.set(0.5, 0);
            mini.position.set(worldX, worldY - tileHeight * 0.75);
            mini.zIndex = 529;
            // small color dot icon to the left
            const dot = new PIXI.Graphics();
            const colorMap: Record<string, number> = { grain: 0x16a34a, wood: 0x92400e, planks: 0xf59e0b, coin: 0xfbbf24, favor: 0x7c3aed, mana: 0x2563eb };
            dot.beginFill(colorMap[resKey] ?? 0x475569, 0.95);
            dot.drawCircle(0, 0, 3);
            dot.endFill();
            dot.position.set(mini.position.x - (mini.width / 2) - 8, mini.position.y + 7);
            dot.zIndex = mini.zIndex;
            if (buildingContainer) { buildingContainer.addChild(dot); buildingContainer.addChild(mini); }
            miniOutRef.current.set(b.id, mini);
          }
        } catch {}

        // Worker pips with capacity ghosts
        const def = SIM_BUILDINGS[b.typeId];
        const baseCap = def?.workCapacity ?? 0;
        const lvl = Math.max(1, Number(b.level ?? 1));
        const cap = Math.max(0, Math.round(baseCap * (1 + 0.25 * (lvl - 1))));
        const workers = Math.max(0, Math.min(cap, Number(b.workers ?? 0)));
        if (cap > 0) {
          const pips = new PIXI.Graphics();
          pips.position.set(worldX, worldY - tileHeight * 0.55);
          pips.zIndex = 525;
          const count = Math.min(12, cap);
          const radius = Math.max(1.5, Math.min(3, tileHeight * 0.08));
          const spacing = Math.max(6, Math.min(10, tileWidth * 0.12));
          const totalWidth = (count - 1) * spacing;
          const color = getPipColor(b.typeId);
          for (let i = 0; i < count; i++) {
            const cx = -totalWidth / 2 + i * spacing;
            if (i < Math.min(workers, count)) {
              pips.beginFill(color, 0.95);
              pips.drawCircle(cx, 0, radius);
              pips.endFill();
            } else {
              // ghost slot
              pips.lineStyle(1, 0x94a3b8, 0.9);
              pips.drawCircle(cx, 0, radius);
            }
          }
          if (cap > 12) {
            const more = new PIXI.Text({ text: `${cap}+`, style: new PIXI.TextStyle({ fontSize: 9, fill: 0x475569 }) });
            more.anchor.set(0, 0.5);
            more.position.set(totalWidth / 2 + 6, 0);
            more.zIndex = 526;
            pips.addChild(more);
          }
          if (buildingContainer) buildingContainer.addChild(pips);
        }
      } else {
        const g = new PIXI.Graphics();
        g.position.set(worldX, worldY);
        g.zIndex = 510; // above tiles
        drawIcon(g, b.typeId, tileWidth, tileHeight);
        if (buildingContainer) buildingContainer.addChild(g);

        const labelText = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
        const lbl = new PIXI.Text({
          text: labelText,
          style: new PIXI.TextStyle({
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
            fontSize: 10,
            fill: 0x1f2937,
            stroke: { color: 0xffffff, width: 3, join: 'round' },
          }),
        });
        lbl.anchor.set(0.5, 0);
        lbl.position.set(worldX, worldY - tileHeight * 0.9);
        lbl.zIndex = 516;
        lbl.eventMode = 'static';
        lbl.cursor = 'pointer';
        lbl.on('pointertap', () => {
          try {
            window.dispatchEvent(new CustomEvent('ad_select_tile', { detail: { gridX: b.x, gridY: b.y, tileWidth, tileHeight } }));
          } catch {}
        });
        if (buildingContainer) buildingContainer.addChild(lbl);
        labelsRef.current.set(b.id, lbl);

        if (storeLinked.current.has(b.id) && (b.typeId === 'farm' || b.typeId === 'lumber_camp' || b.typeId === 'sawmill')) {
          const badge = new PIXI.Container();
          badge.eventMode = 'static';
          badge.cursor = 'help';
          badge.position.set(worldX + tileWidth * 0.32, worldY - tileHeight * 0.95);
          badge.zIndex = 517;
          const bg2 = new PIXI.Graphics();
          bg2.beginFill(0x083344, 0.9);
          bg2.drawRoundedRect(-14, -10, 28, 16, 3);
          bg2.endFill();
          bg2.lineStyle(1, 0x06b6d4, 1);
          bg2.drawRoundedRect(-14, -10, 28, 16, 3);
          badge.addChild(bg2);
          const link = new PIXI.Graphics();
          link.lineStyle(2, 0x06b6d4, 1);
          link.moveTo(-8, -3); link.lineTo(-4, 1); link.lineTo(0, -3);
          badge.addChild(link);
          const txt = new PIXI.Text({ text: '+15%', style: new PIXI.TextStyle({ fontSize: 9, fill: 0x67e8f9, fontFamily: 'ui-sans-serif, system-ui' }) });
          txt.anchor.set(0, 0.5);
          txt.position.set(2, -2);
          badge.addChild(txt);
          badge.on('pointerover', () => {
            showTooltip('Logistics: +15% output', badge.position.x, badge.position.y, 0x06b6d4);
          });
          badge.on('pointerout', () => hideTooltip());
          if (buildingContainer) buildingContainer.addChild(badge);
        }

        // Mini output for vector-drawn variant
        try {
          const defOut2 = simDef?.outputs || {};
          const pairs2 = Object.entries(defOut2).filter(([,v]) => (v as number) > 0) as Array<[string, number]>;
          if (pairs2.length) {
            pairs2.sort((a,b)=> (b[1]||0) - (a[1]||0));
            const base2 = pairs2[0][1] as number;
            const capBase2 = simDef?.workCapacity ?? 0;
            const lvl2 = Math.max(1, Number(b.level ?? 1));
            const cap2 = Math.round(capBase2 * (1 + 0.25 * (lvl2 - 1)));
            const ratio2 = cap2 > 0 ? Math.min(1, (Number(b.workers || 0)) / cap2) : 1;
            const out2 = Math.max(0, Math.round(base2 * ratio2 * (1 + 0.5 * (lvl2 - 1))));
            const resKey2 = String(pairs2[0][0]);
            const mini2 = new PIXI.Text({ text: `≈ +${out2} ${resKey2}`, style: new PIXI.TextStyle({ fontSize: 10, fill: 0x64748b, fontFamily: 'ui-sans-serif, system-ui', stroke: { color: 0xffffff, width: 3 } }) });
            mini2.anchor.set(0.5, 0);
            mini2.position.set(worldX, worldY - tileHeight * 0.75);
            mini2.zIndex = 515;
            const dot2 = new PIXI.Graphics();
            const colorMap2: Record<string, number> = { grain: 0x16a34a, wood: 0x92400e, planks: 0xf59e0b, coin: 0xfbbf24, favor: 0x7c3aed, mana: 0x2563eb };
            dot2.beginFill(colorMap2[resKey2] ?? 0x475569, 0.95);
            dot2.drawCircle(0, 0, 3);
            dot2.endFill();
            dot2.position.set(mini2.position.x - (mini2.width / 2) - 8, mini2.position.y + 7);
            dot2.zIndex = mini2.zIndex;
            if (buildingContainer) {
              buildingContainer.addChild(dot2);
              buildingContainer.addChild(mini2);
            }
            miniOutRef.current.set(b.id, mini2);
          }
        } catch {}

        // Worker pips with capacity ghosts for vector-drawn buildings
        const def2 = SIM_BUILDINGS[b.typeId];
        const baseCap2 = def2?.workCapacity ?? 0;
        const lvl2 = Math.max(1, Number(b.level ?? 1));
        const cap2 = Math.max(0, Math.round(baseCap2 * (1 + 0.25 * (lvl2 - 1))));
        const workers2 = Math.max(0, Math.min(cap2, Number(b.workers ?? 0)));
        if (cap2 > 0) {
          const pips = new PIXI.Graphics();
          pips.position.set(worldX, worldY - tileHeight * 0.55);
          pips.zIndex = 515;
          const count = Math.min(12, cap2);
          const radius = Math.max(1.5, Math.min(3, tileHeight * 0.08));
          const spacing = Math.max(6, Math.min(10, tileWidth * 0.12));
          const totalWidth = (count - 1) * spacing;
          const color = getPipColor(b.typeId);
          for (let i = 0; i < count; i++) {
            const cx = -totalWidth / 2 + i * spacing;
            if (i < Math.min(workers2, count)) {
              pips.beginFill(color, 0.95);
              pips.drawCircle(cx, 0, radius);
              pips.endFill();
            } else {
              pips.lineStyle(1, 0x94a3b8, 0.9);
              pips.drawCircle(cx, 0, radius);
            }
          }
          if (cap2 > 12) {
            const more = new PIXI.Text({ text: `${cap2}+`, style: new PIXI.TextStyle({ fontSize: 9, fill: 0x475569 }) });
            more.anchor.set(0, 0.5);
            more.position.set(totalWidth / 2 + 6, 0);
            more.zIndex = 516;
            pips.addChild(more);
          }
          if (buildingContainer) buildingContainer.addChild(pips);
        }
      }
    });
  }, [JSON.stringify(buildings), tileWidth, tileHeight, viewport, JSON.stringify(storeConnectedIds), JSON.stringify(selected)]);

  // Toggle labels by zoom level with simple collision-avoidance
  useEffect(() => {
    if (!viewport || !containerRef.current) return;

    const intersects = (a: PIXI.Rectangle, b: PIXI.Rectangle, pad = 2) => {
      const ax1 = a.x - pad, ay1 = a.y - pad, ax2 = a.x + a.width + pad, ay2 = a.y + a.height + pad;
      const bx1 = b.x - pad, by1 = b.y - pad, bx2 = b.x + b.width + pad, by2 = b.y + b.height + pad;
      return !(ax2 < bx1 || ax1 > bx2 || ay2 < by1 || ay1 > by2);
    };

    const update = () => {
      const scale = viewport.scale?.x ?? 1;
      const labelVisible = scale >= 1.5; // raise threshold to reduce clutter
      const miniVisible = scale >= 1.7;  // show mini outputs only when zoomed in further

      // Labels: basic collision suppression
      const shownLabelBoxes: PIXI.Rectangle[] = [];
      labelsRef.current.forEach((t) => { t.visible = false; });
      if (labelVisible) {
        const labels = Array.from(labelsRef.current.values());
        // Prefer lower (larger y) labels first so higher tiles yield to closer ones
        labels.sort((a,b)=> a.getBounds().y - b.getBounds().y);
        for (const t of labels) {
          const bnd = t.getBounds();
          const box = new PIXI.Rectangle(bnd.x, bnd.y, bnd.width, bnd.height);
          if (!shownLabelBoxes.some(bx => intersects(bx, box, 4))) {
            t.visible = true;
            shownLabelBoxes.push(box);
          }
        }
      }

      // Mini outputs: also collision-aware
      const shownMiniBoxes: PIXI.Rectangle[] = [];
      miniOutRef.current.forEach((t) => { t.visible = false; });
      if (miniVisible) {
        const minis = Array.from(miniOutRef.current.values());
        minis.sort((a,b)=> a.getBounds().y - b.getBounds().y);
        for (const t of minis) {
          const bnd = t.getBounds();
          const box = new PIXI.Rectangle(bnd.x, bnd.y, bnd.width, bnd.height);
          if (!shownMiniBoxes.some(bx => intersects(bx, box, 2))) {
            t.visible = true;
            shownMiniBoxes.push(box);
          }
        }
      }
    };

    update();
    viewport.on('zoomed', update);
    viewport.on('moved', update);
    return () => {
      viewport.off('zoomed', update);
      viewport.off('moved', update);
    };
  }, [viewport]);

  return null;
}

export type { BuildingsLayerProps };
