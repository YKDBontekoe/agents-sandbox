import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { useLocalStoragePersistence } from './persistence';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface HarnessProps<T> {
  storageKey: string;
  data: T;
  callback: (stored: T) => void;
}

function Harness<T>({ storageKey, data, callback }: HarnessProps<T>): null {
  useLocalStoragePersistence(storageKey, data, callback);
  return null;
}

describe('useLocalStoragePersistence', () => {
  it('hydrates only when the key changes while keeping the latest onHydrate handler', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const firstHydrate = vi.fn<(value: number) => void>();
    const secondHydrate = vi.fn<(value: number) => void>();

    localStorage.clear();
    localStorage.setItem('profile:test', JSON.stringify(42));
    localStorage.setItem('profile:other', JSON.stringify(7));

    const renderHarness = async (props: HarnessProps<number>) => {
      await act(async () => {
        root.render(createElement(Harness<number>, props));
      });
    };

    try {
      await renderHarness({ storageKey: 'profile:test', data: 0, callback: firstHydrate });

      expect(firstHydrate).toHaveBeenCalledTimes(1);
      expect(firstHydrate).toHaveBeenCalledWith(42);
      expect(secondHydrate).not.toHaveBeenCalled();
      expect(localStorage.getItem('profile:test')).toBe('0');

      await renderHarness({ storageKey: 'profile:test', data: 1, callback: secondHydrate });

      expect(firstHydrate).toHaveBeenCalledTimes(1);
      expect(secondHydrate).not.toHaveBeenCalled();
      expect(localStorage.getItem('profile:test')).toBe('1');

      await renderHarness({ storageKey: 'profile:other', data: 2, callback: secondHydrate });

      expect(firstHydrate).toHaveBeenCalledTimes(1);
      expect(secondHydrate).toHaveBeenCalledTimes(1);
      expect(secondHydrate).toHaveBeenCalledWith(7);
      expect(localStorage.getItem('profile:other')).toBe('2');

      await renderHarness({ storageKey: 'profile:other', data: 3, callback: secondHydrate });

      expect(secondHydrate).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('profile:other')).toBe('3');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
      localStorage.clear();
    }
  });
});

