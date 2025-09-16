import React, { act, type ComponentProps } from 'react';
import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { ModularActionPanel } from '../ModularActionPanel';
import { HUDLayoutProvider } from '../../HUDLayoutSystem';
import { HUDPanelRegistryProvider } from '../../HUDPanelRegistry';

describe('ModularActionPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderPanel = (props: Partial<ComponentProps<typeof ModularActionPanel>> = {}) => {
    act(() => {
      root.render(
        <HUDLayoutProvider layoutPreset="compact">
          <HUDPanelRegistryProvider>
            <ModularActionPanel {...props} />
          </HUDPanelRegistryProvider>
        </HUDLayoutProvider>
      );
    });
  };

  const getBadgeValue = (label: string) => {
    const button = Array.from(container.querySelectorAll('button')).find(btn =>
      btn.textContent?.includes(label)
    );
    const badge = button?.querySelector<HTMLSpanElement>('span.bg-red-500');
    return badge?.textContent ?? undefined;
  };

  beforeAll(() => {
    const globals = globalThis as typeof globalThis & {
      requestAnimationFrame?: typeof globalThis.requestAnimationFrame;
      cancelAnimationFrame?: typeof globalThis.cancelAnimationFrame;
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };

    globals.IS_REACT_ACT_ENVIRONMENT = true;

    if (!globals.requestAnimationFrame) {
      globals.requestAnimationFrame = (callback: FrameRequestCallback) => (
        setTimeout(() => callback(performance.now()), 0) as unknown as number
      );
    }
    if (!globals.cancelAnimationFrame) {
      globals.cancelAnimationFrame = (handle: number) => {
        clearTimeout(handle);
      };
    }
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('displays and updates action badges based on provided counts', () => {
    renderPanel({ pendingCouncil: 3, pendingOmens: 1 });

    expect(getBadgeValue('Council')).toBe('3');
    expect(getBadgeValue('Omens')).toBe('1');
    expect(getBadgeValue('Edicts')).toBeUndefined();

    renderPanel({ pendingCouncil: 1, pendingOmens: 0 });

    expect(getBadgeValue('Council')).toBe('1');
    expect(getBadgeValue('Omens')).toBeUndefined();
  });
});
