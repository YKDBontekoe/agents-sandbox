import * as PIXI from "pixi.js";

export default function drawShrine(g: PIXI.Graphics, tw: number, th: number) {
  g.beginFill(0x7c3aed);
  g.drawCircle(0, 0, Math.min(tw, th) * 0.18);
  g.endFill();
}
