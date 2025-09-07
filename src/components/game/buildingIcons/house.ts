import * as PIXI from "pixi.js";

export default function drawHouse(g: PIXI.Graphics, tw: number, th: number) {
  g.beginFill(0x9f1239);
  g.drawRect(-tw * 0.16, -th * 0.02, tw * 0.32, th * 0.16);
  g.endFill();
}
