import * as PIXI from "pixi.js";

export default function drawCouncilHall(g: PIXI.Graphics, tw: number, th: number) {
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
}
