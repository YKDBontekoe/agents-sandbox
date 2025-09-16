import type { Container, EventMode } from "pixi.js";

export type EventEnabledContainer = Container & {
  eventMode: EventMode;
};

const STATIC_EVENT_MODE: EventMode = "static";

const hasEventMode = (
  container: Container
): container is EventEnabledContainer => "eventMode" in container;

export const ensureStaticEventMode = (container: Container) => {
  if (hasEventMode(container)) {
    container.eventMode = STATIC_EVENT_MODE;
    return;
  }

  Object.defineProperty(container, "eventMode", {
    configurable: true,
    enumerable: true,
    writable: true,
    value: STATIC_EVENT_MODE,
  });
};
