"use client";

import { forwardRef, useEffect, useRef, ReactNode, MutableRefObject } from "react";
import { PixiComponent, applyDefaultProps } from "@pixi/react";
import { Viewport } from "pixi-viewport";
import type { Application } from "pixi.js";
import { useGameContext } from "./GameContext";
import useViewport from "./useViewport";

interface PixiViewportProps {
  app: Application;
  width: number;
  height: number;
  children?: ReactNode;
}

const PixiViewport = PixiComponent<PixiViewportProps, Viewport>("Viewport", {
  create: ({ app, width, height }) =>
    new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: 2000,
      worldHeight: 2000,
      events: app.renderer.events,
    }),
  applyProps: (instance, oldProps, newProps) => {
    if (oldProps.width !== newProps.width || oldProps.height !== newProps.height) {
      instance.resize(newProps.width, newProps.height);
    }
    applyDefaultProps(instance, oldProps, newProps);
  },
});

interface ViewportComponentProps {
  width: number;
  height: number;
  children?: ReactNode;
}

const ViewportComponent = forwardRef<Viewport, ViewportComponentProps>(function ViewportComponent(
  { width, height, children },
  ref,
) {
  const { app, setViewport } = useGameContext();
  const viewportRef = useRef<Viewport | null>(null);

  useEffect(() => {
    const vp = viewportRef.current;
    if (vp) {
      setViewport(vp);
      return () => setViewport(null);
    }
  }, [setViewport]);

  useViewport(viewportRef.current);

  if (!app) return null;

  return (
    <PixiViewport
      ref={(instance) => {
        viewportRef.current = instance;
        if (typeof ref === "function") ref(instance);
        else if (ref) (ref as MutableRefObject<Viewport | null>).current = instance;
      }}
      app={app}
      width={width}
      height={height}
    >
      {children}
    </PixiViewport>
  );
});

export default ViewportComponent;
