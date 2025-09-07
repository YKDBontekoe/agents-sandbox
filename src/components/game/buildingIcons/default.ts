import * as PIXI from "pixi.js";

export default function drawDefaultIcon(g: PIXI.Graphics, tw: number, th: number) {
  g.beginFill(0x334155);
  g.drawCircle(0, 0, Math.min(tw, th) * 0.12);
  g.endFill();
}
