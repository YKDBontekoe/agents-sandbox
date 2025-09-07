import * as PIXI from "pixi.js";

export default function drawFarm(g: PIXI.Graphics, tw: number, th: number) {
  g.beginFill(0x16a34a);
  g.drawRect(-tw * 0.2, -th * 0.02, tw * 0.4, th * 0.18);
  g.endFill();
}
