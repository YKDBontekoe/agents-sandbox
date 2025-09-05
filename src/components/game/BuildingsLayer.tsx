"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useGameContext } from "./GameContext";
import { gridToWorld } from "@/lib/isometric";
import { getBuildingSpriteUrl } from "./buildingAssets";
import { SIM_BUILDINGS } from "./simCatalog";

export interface SimpleBuilding {
  id: string;
  typeId: string;
  x: number;
  y: number;
  workers?: number;
  level?: number;
}

interface BuildingsLayerProps {
  buildings: SimpleBuilding[];
  tileWidth?: number;
  tileHeight?: number;
}

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

  switch (typeId) {
    case 'council_hall': {
      // stone hall with roof
      g.beginFill(0x9ca3af);
      g.drawRect(-tw * 0.22, -th * 0.05, tw * 0.44, th * 0.28);
      g.endFill();
      g.beginFill(0xb45309);
      g.moveTo(0, -th * 0.22);
      g.lineTo(tw * 0.26, -th * 0.05);
      g.lineTo(-tw * 0.26, -th * 0.05);
      g.closePath();
      g.endFill();
      break;
    }
    case 'trade_post': {
      // tent + banner
      g.beginFill(0xf59e0b);
      g.moveTo(-tw * 0.18, 0);
      g.lineTo(0, -th * 0.18);
      g.lineTo(tw * 0.18, 0);
      g.lineTo(-tw * 0.18, 0);
      g.endFill();
      g.lineStyle(2, 0x92400e, 1);
      g.moveTo(0, -th * 0.18);
      g.lineTo(0, -th * 0.32);
      g.beginFill(0x2563eb);
      g.drawPolygon([
        0, -th * 0.32,
        tw * 0.12, -th * 0.28,
        0, -th * 0.24,
      ]);
      g.endFill();
      break;
    }
    case 'automation_workshop': {
      // cog-like gear
      g.beginFill(0x6b7280);
      const r = Math.min(tw, th) * 0.18;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * (r * 1.2);
        const y = Math.sin(a) * (r * 1.2);
        g.drawRect(x - 2, y - 2, 4, 4);
      }
      g.drawCircle(0, 0, r);
      g.endFill();
      g.beginFill(0xfcd34d);
      g.drawCircle(0, 0, r * 0.35);
      g.endFill();
      break;
    }
    case 'farm': {
      g.beginFill(0x16a34a);
      g.drawRect(-tw * 0.2, -th * 0.02, tw * 0.4, th * 0.18);
      g.endFill();
      break;
    }
    case 'lumber_camp': {
      // log pile
      g.beginFill(0x92400e);
      g.drawRect(-tw * 0.22, -th * 0.02, tw * 0.44, th * 0.06);
      g.drawRect(-tw * 0.18, th * 0.04, tw * 0.36, th * 0.06);
      g.endFill();
      break;
    }
    case 'sawmill': {
      // small mill blade + plank stack
      g.beginFill(0x6b7280);
      g.drawCircle(-tw * 0.1, 0, Math.min(tw, th) * 0.12);
      g.endFill();
      g.beginFill(0xf59e0b);
      g.drawRect(tw * 0.02, -th * 0.02, tw * 0.28, th * 0.1);
      g.endFill();
      break;
    }
    case 'storehouse': {
      // warehouse box
      g.beginFill(0x334155);
      g.drawRect(-tw * 0.18, -th * 0.04, tw * 0.36, th * 0.2);
      g.endFill();
      break;
    }
    case 'shrine': {
      g.beginFill(0x7c3aed);
      g.drawCircle(0, 0, Math.min(tw, th) * 0.18);
      g.endFill();
      break;
    }
    case 'house': {
      g.beginFill(0x9f1239);
      g.drawRect(-tw * 0.16, -th * 0.02, tw * 0.32, th * 0.16);
      g.endFill();
      break;
    }
    default: {
      g.beginFill(0x334155);
      g.drawCircle(0, 0, Math.min(tw, th) * 0.12);
      g.endFill();
      break;
    }
  }
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

export default function BuildingsLayer({ buildings, tileWidth = 64, tileHeight = 32 }: BuildingsLayerProps) {
  const { viewport } = useGameContext();
  const containerRef = useRef<PIXI.Container | null>(null);
  const labelsRef = useRef<Map<string, PIXI.Text>>(new Map());
  const tooltipRef = useRef<PIXI.Container | null>(null);
  const tooltipTextRef = useRef<PIXI.Text | null>(null);

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
      tooltipRef.current = null;
      tooltipTextRef.current = null;
    };
  }, [viewport]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.removeChildren();
    labelsRef.current.clear();

    const showTooltip = (text: string, x: number, y: number) => {
      const tip = tooltipRef.current;
      const txt = tooltipTextRef.current;
      if (!tip || !txt) return;
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
      tip.position.set(x - w/2, y - h - 6);
      tip.visible = true;
    };
    const hideTooltip = () => { if (tooltipRef.current) tooltipRef.current.visible = false; };

    buildings.forEach((b) => {
      const { worldX, worldY } = gridToWorld(b.x, b.y, tileWidth, tileHeight);
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

        const spr = PIXI.Sprite.from(url);
        spr.anchor.set(0.5);
        spr.position.set(worldX, worldY - tileHeight * 0.06);
        spr.zIndex = 520;
        (spr as any).eventMode = 'static';
        (spr as any).cursor = 'pointer';
        spr.on('pointerover', () => {
          const nm = SIM_BUILDINGS[b.typeId]?.name || b.typeId;
          const lvl = Math.max(1, Number(b.level ?? 1));
          const workers = Number(b.workers ?? 0);
          const capBase = SIM_BUILDINGS[b.typeId]?.workCapacity ?? 0;
          const cap = Math.round(capBase * (1 + 0.25 * (lvl - 1)));
          showTooltip(`${nm} • Lv.${lvl}\nWorkers ${workers}/${cap}`, worldX, worldY - tileHeight * 0.9);
          try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: b.id } })); } catch {}
        });
        spr.on('pointerout', () => { hideTooltip(); try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: null } })); } catch {} });
        // double-click to start route for storehouse/trade_post
        let lastTap = 0;
        spr.on('pointertap', () => {
          const now = Date.now();
          if (now - lastTap < 300 && (b.typeId === 'storehouse' || b.typeId === 'trade_post')) {
            try { window.dispatchEvent(new CustomEvent('ad_start_route', { detail: { buildingId: b.id } })); } catch {}
          }
          lastTap = now;
        });
        // Scale to roughly fit within a tile diamond
        const targetW = tileWidth * 0.7;
        const targetH = tileHeight * 1.05;
        // If base texture size is unknown yet, set scale after first update tick
        const applyScale = () => {
          const bw = spr.texture.width || 64;
          const bh = spr.texture.height || 64;
          const sx = targetW / bw;
          const sy = targetH / bh;
          const s = Math.min(sx, sy);
          spr.scale.set(s);
        };
        if (spr.texture.width > 0 && spr.texture.height > 0) {
          applyScale();
        } else {
          // Fallback: apply scale immediately if texture dimensions are not available
          applyScale();
        }
        container.addChild(shadow);
        container.addChild(frame);
        container.addChild(spr);

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
        (lbl as any).eventMode = 'static';
        (lbl as any).cursor = 'pointer';
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
          showTooltip(`${nm} • Lv.${lvl}\nWorkers ${workers}/${cap}`, worldX, worldY - tileHeight * 0.9);
          try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: b.id } })); } catch {}
        });
        lbl.on('pointerout', () => { hideTooltip(); try { window.dispatchEvent(new CustomEvent('ad_hover_building', { detail: { buildingId: null } })); } catch {} });
        // double-click on label
        let lastTapLbl = 0;
        lbl.on('pointertap', () => {
          const now = Date.now();
          if (now - lastTapLbl < 300 && (b.typeId === 'storehouse' || b.typeId === 'trade_post')) {
            try { window.dispatchEvent(new CustomEvent('ad_start_route', { detail: { buildingId: b.id } })); } catch {}
          }
          lastTapLbl = now;
        });
        container.addChild(lbl);
        labelsRef.current.set(b.id, lbl);

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
          container.addChild(pips);
        }
      } else {
        const g = new PIXI.Graphics();
        g.position.set(worldX, worldY);
        g.zIndex = 510; // above tiles
        drawIcon(g, b.typeId, tileWidth, tileHeight);
        container.addChild(g);

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
        (lbl as any).eventMode = 'static';
        (lbl as any).cursor = 'pointer';
        lbl.on('pointertap', () => {
          try {
            window.dispatchEvent(new CustomEvent('ad_select_tile', { detail: { gridX: b.x, gridY: b.y, tileWidth, tileHeight } }));
          } catch {}
        });
        container.addChild(lbl);
        labelsRef.current.set(b.id, lbl);

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
          container.addChild(pips);
        }
      }
    });
  }, [JSON.stringify(buildings), tileWidth, tileHeight]);

  // Toggle labels by zoom level
  useEffect(() => {
    if (!viewport || !containerRef.current) return;
    const container = containerRef.current;
    const update = () => {
      const scale = viewport.scale?.x ?? 1;
      const visible = scale >= 1.25;
      labelsRef.current.forEach((t) => { t.visible = visible; });
    };
    update();
    viewport.on('zoomed', update);
    return () => { viewport.off('zoomed', update); };
  }, [viewport]);

  return null;
}

export type { BuildingsLayerProps };
