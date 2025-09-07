import * as PIXI from "pixi.js";

export default function drawLumberCamp(g: PIXI.Graphics, tw: number, th: number) {
  // log pile
  g.beginFill(0x92400e);
  g.drawRect(-tw * 0.22, -th * 0.02, tw * 0.44, th * 0.06);
  g.drawRect(-tw * 0.18, th * 0.04, tw * 0.36, th * 0.06);
  g.endFill();
}
