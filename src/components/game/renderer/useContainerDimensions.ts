import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

interface UseContainerDimensionsOptions {
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

interface ContainerDimensionsResult {
  ref: MutableRefObject<HTMLDivElement | null>;
  width: number;
  height: number;
}

const DEFAULT_MIN_SIZE = 320;

function clampSize(value: number | undefined, minimum: number) {
  return Math.max(minimum, Math.floor(value ?? minimum));
}

export function useContainerDimensions({
  initialWidth,
  initialHeight,
  minWidth = DEFAULT_MIN_SIZE,
  minHeight = DEFAULT_MIN_SIZE,
}: UseContainerDimensionsOptions = {}): ContainerDimensionsResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState(() => ({
    width: clampSize(initialWidth, minWidth),
    height: clampSize(initialHeight, minHeight),
  }));

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    let frameId: number | null = null;
    let pending = false;

    const measure = () => {
      pending = false;
      const rect = element.getBoundingClientRect();
      const nextWidth = clampSize(rect.width, minWidth);
      const nextHeight = clampSize(rect.height, minHeight);

      setDimensions(prev =>
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight },
      );
      frameId = null;
    };

    const scheduleMeasure = () => {
      if (pending) return;
      pending = true;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(scheduleMeasure);
      observer.observe(element);

      return () => {
        observer.disconnect();
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
        pending = false;
      };
    }

    const handleResize = () => scheduleMeasure();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      pending = false;
    };
  }, [minHeight, minWidth]);

  return { ref: containerRef, width: dimensions.width, height: dimensions.height };
}
