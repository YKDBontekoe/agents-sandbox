import { useEffect } from "react";
import type { Viewport } from "pixi-viewport";

export interface ViewportCenterOptions {
  x: number;
  y: number;
}

export interface ViewportZoomOptions {
  value: number;
  animate?: boolean;
}

type PluginOption<T> = T | boolean | undefined;

type DragOptions = Parameters<Viewport["drag"]>[0];
type PinchOptions = Parameters<Viewport["pinch"]>[0];
type WheelOptions = Parameters<Viewport["wheel"]>[0];
type DecelerateOptions = Parameters<Viewport["decelerate"]>[0];
type ClampOptions = Parameters<Viewport["clamp"]>[0];
type ClampZoomOptions = Parameters<Viewport["clampZoom"]>[0];

export interface UseViewportSetupOptions {
  viewport: Viewport | null | undefined;
  zoom?: ViewportZoomOptions | null;
  center?: ViewportCenterOptions | null;
  clamp?: PluginOption<ClampOptions>;
  clampZoom?: PluginOption<ClampZoomOptions>;
  drag?: PluginOption<DragOptions>;
  pinch?: PluginOption<PinchOptions>;
  wheel?: PluginOption<WheelOptions>;
  decelerate?: PluginOption<DecelerateOptions>;
}

function shouldEnablePlugin<T>(option: PluginOption<T>): option is T | true {
  return option !== undefined && option !== false;
}

export function useViewportSetup({
  viewport,
  zoom,
  center,
  clamp,
  clampZoom,
  drag,
  pinch,
  wheel,
  decelerate,
}: UseViewportSetupOptions): void {
  const zoomValue = zoom?.value;
  const zoomAnimate = zoom?.animate ?? true;

  useEffect(() => {
    if (!viewport || zoomValue === undefined) return;

    viewport.setZoom(zoomValue, zoomAnimate);
  }, [viewport, zoomValue, zoomAnimate]);

  const centerX = center?.x;
  const centerY = center?.y;

  useEffect(() => {
    if (!viewport || centerX === undefined || centerY === undefined) return;

    viewport.moveCenter(centerX, centerY);
  }, [viewport, centerX, centerY]);

  useEffect(() => {
    if (!viewport || clamp === undefined) return;

    viewport.plugins.remove("clamp");
    if (shouldEnablePlugin(clamp)) {
      if (clamp === true) {
        viewport.clamp();
      } else {
        viewport.clamp(clamp ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("clamp");
    };
  }, [viewport, clamp]);

  useEffect(() => {
    if (!viewport || clampZoom === undefined) return;

    viewport.plugins.remove("clamp-zoom");
    if (shouldEnablePlugin(clampZoom)) {
      if (clampZoom === true) {
        viewport.clampZoom({});
      } else {
        viewport.clampZoom(clampZoom ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("clamp-zoom");
    };
  }, [viewport, clampZoom]);

  useEffect(() => {
    if (!viewport || drag === undefined) return;

    viewport.plugins.remove("drag");
    if (shouldEnablePlugin(drag)) {
      if (drag === true) {
        viewport.drag();
      } else {
        viewport.drag(drag ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("drag");
    };
  }, [viewport, drag]);

  useEffect(() => {
    if (!viewport || pinch === undefined) return;

    viewport.plugins.remove("pinch");
    if (shouldEnablePlugin(pinch)) {
      if (pinch === true) {
        viewport.pinch();
      } else {
        viewport.pinch(pinch ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("pinch");
    };
  }, [viewport, pinch]);

  useEffect(() => {
    if (!viewport || wheel === undefined) return;

    viewport.plugins.remove("wheel");
    if (shouldEnablePlugin(wheel)) {
      if (wheel === true) {
        viewport.wheel();
      } else {
        viewport.wheel(wheel ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("wheel");
    };
  }, [viewport, wheel]);

  useEffect(() => {
    if (!viewport || decelerate === undefined) return;

    viewport.plugins.remove("decelerate");
    if (shouldEnablePlugin(decelerate)) {
      if (decelerate === true) {
        viewport.decelerate();
      } else {
        viewport.decelerate(decelerate ?? undefined);
      }
    }

    return () => {
      viewport.plugins.remove("decelerate");
    };
  }, [viewport, decelerate]);
}
