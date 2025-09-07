import * as PIXI from "pixi.js";

export default function drawTradePost(g: PIXI.Graphics, tw: number, th: number) {
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
}
