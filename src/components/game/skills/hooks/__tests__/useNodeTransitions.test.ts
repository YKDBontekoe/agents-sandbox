import { act, renderHook } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it } from 'vitest';
import { useNodeTransitions } from '../useNodeTransitions';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).navigator = dom.window.navigator;

afterEach(() => {
  dom.window.document.body.innerHTML = '';
});

describe('useNodeTransitions', () => {
  it('progresses transitions toward their targets', () => {
    const { result } = renderHook(() => useNodeTransitions(100));

    act(() => {
      result.current.updateNodeTransition('node-1', { scale: 1.5, opacity: 0.5 });
    });

    const initial = result.current.transitions.get('node-1');
    expect(initial).toBeDefined();
    expect(initial?.targetScale).toBeCloseTo(1.5);
    expect(initial?.targetOpacity).toBeCloseTo(0.5);

    const lastUpdate = initial?.lastUpdate ?? 0;

    act(() => {
      result.current.tickTransitions(lastUpdate + 50);
    });

    const mid = result.current.transitions.get('node-1');
    expect(mid).toBeDefined();
    expect(mid!.scale).toBeGreaterThan(1);
    expect(mid!.scale).toBeLessThan(1.5);
    expect(mid!.opacity).toBeLessThan(1);
    expect(mid!.opacity).toBeGreaterThan(0.5);

    act(() => {
      result.current.tickTransitions(lastUpdate + 200);
    });

    const finalState = result.current.transitions.get('node-1');
    expect(finalState).toBeDefined();
    expect(finalState!.scale).toBeCloseTo(1.5, 2);
    expect(finalState!.opacity).toBeCloseTo(0.5, 2);
  });

  it('merges successive transition updates', () => {
    const { result } = renderHook(() => useNodeTransitions());

    act(() => {
      result.current.updateNodeTransition('node-1', { scale: 1.2 });
    });

    const first = result.current.transitions.get('node-1');
    expect(first).toBeDefined();
    expect(first!.targetScale).toBeCloseTo(1.2);

    act(() => {
      result.current.updateNodeTransition('node-1', { opacity: 0.7 });
    });

    const second = result.current.transitions.get('node-1');
    expect(second).toBeDefined();
    expect(second!.targetScale).toBeCloseTo(1.2);
    expect(second!.targetOpacity).toBeCloseTo(0.7);
  });
});
