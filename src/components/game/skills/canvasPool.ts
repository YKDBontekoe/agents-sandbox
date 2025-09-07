// Canvas pool for efficient memory management
export class CanvasPool {
  private static instance: CanvasPool;
  private canvases: HTMLCanvasElement[] = [];
  private contexts: CanvasRenderingContext2D[] = [];

  static getInstance(): CanvasPool {
    if (!CanvasPool.instance) {
      CanvasPool.instance = new CanvasPool();
    }
    return CanvasPool.instance;
  }

  getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    let canvas = this.canvases.pop();
    let ctx = this.contexts.pop();

    if (!canvas || !ctx) {
      canvas = document.createElement('canvas');
      ctx = canvas.getContext('2d')!;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    return { canvas, ctx };
  }

  returnCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    if (this.canvases.length < 5) {
      // Limit pool size
      this.canvases.push(canvas);
      this.contexts.push(ctx);
    }
  }
}
