import * as PIXI from "pixi.js";

export default function drawSawmill(g: PIXI.Graphics, tw: number, th: number) {
  // small mill blade + plank stack
  g.beginFill(0x6b7280);
  g.drawCircle(-tw * 0.1, 0, Math.min(tw, th) * 0.12);
  g.endFill();
  g.beginFill(0xf59e0b);
  g.drawRect(tw * 0.02, -th * 0.02, tw * 0.28, th * 0.1);
  g.endFill();
}
