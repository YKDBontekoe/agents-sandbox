import * as PIXI from "pixi.js";

export default function drawAutomationWorkshop(g: PIXI.Graphics, tw: number, th: number) {
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
}
