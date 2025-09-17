import { useEffect, useRef } from 'react';
import type { Application, Container } from 'pixi.js';

export interface SpritePoolLayer<Item> {
  items: readonly Item[];
  enabled?: boolean;
  getId: (item: Item) => string;
  create: (item: Item) => unknown;
  update?: (sprite: unknown, item: Item) => void;
}

export interface UseSpritePoolOptions {
  app: Application | null;
  container: Container | null;
  layers: Array<SpritePoolLayer<any>>;
}

export function useSpritePool({ app, container, layers }: UseSpritePoolOptions): void {
  const layersRef = useRef(layers);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    if (!app || !container) {
      return undefined;
    }

    let frameId: number | undefined;
    const spritePool = new Map<string, any>();
    const activeSprites = new Set<string>();

    const tick = () => {
      activeSprites.clear();

      layersRef.current.forEach(layer => {
        if (layer.enabled === false) {
          return;
        }

        layer.items.forEach(item => {
          const id = layer.getId(item);
          activeSprites.add(id);

          let sprite = spritePool.get(id);
          if (!sprite) {
            const created = layer.create(item);
            if (!created) {
              return;
            }
            sprite = created;
            spritePool.set(id, sprite);
            container.addChild(sprite);
          } else {
            sprite.visible = true;
          }

          layer.update?.(sprite, item);
        });
      });

      spritePool.forEach((sprite, id) => {
        if (!activeSprites.has(id)) {
          sprite.visible = false;
        }
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      spritePool.forEach(sprite => {
        if (sprite.parent === container) {
          container.removeChild(sprite);
        }
        sprite.destroy();
      });
      spritePool.clear();
      activeSprites.clear();
    };
  }, [app, container]);
}
