import * as PIXI from "pixi.js";

export default function drawStorehouse(g: PIXI.Graphics, tw: number, th: number) {
  // warehouse box
  g.beginFill(0x334155);
  g.drawRect(-tw * 0.18, -th * 0.04, tw * 0.36, th * 0.2);
  g.endFill();
}
