import type { FC } from 'react';
import { describe, expect, it } from 'vitest';
import type { HUDZone } from '../HUDLayoutSystem';
import {
  createPanelRegistryStore,
  type HUDPanelComponent
} from '../panelRegistryStore';

const DummyPanel: FC = () => null;

function createPanel(id: string, zone: HUDZone, overrides: Partial<HUDPanelComponent> = {}) {
  return {
    config: { id, zone },
    component: DummyPanel,
    ...overrides
  } as HUDPanelComponent;
}

describe('panelRegistryStore', () => {
  it('registers panels with responsive defaults', () => {
    const store = createPanelRegistryStore();

    const panel = createPanel('responsive', 'top-left', {
      config: {
        id: 'responsive',
        zone: 'top-left',
        responsive: { hideOnMobile: true, collapseOnMobile: true }
      }
    });

    store.registerPanel(panel, { screenSize: 'mobile' });

    const storedPanel = store.getPanelById('responsive');
    expect(storedPanel).toBeDefined();
    expect(storedPanel?.isVisible).toBe(false);
    expect(storedPanel?.isCollapsed).toBe(true);
  });

  it('supports toggling visibility and collapse state', () => {
    const store = createPanelRegistryStore();
    const panel = createPanel('toggle', 'top-left');
    store.registerPanel(panel, { screenSize: 'desktop' });

    store.togglePanelVisibility('toggle');
    expect(store.getPanelById('toggle')?.isVisible).toBe(false);

    store.togglePanelCollapse('toggle');
    expect(store.getPanelById('toggle')?.isCollapsed).toBe(true);
  });

  it('updates panel entries with partial data', () => {
    const store = createPanelRegistryStore();
    const panel = createPanel('update', 'top-left');
    store.registerPanel(panel, { screenSize: 'desktop' });

    store.updatePanel('update', { isVisible: false, props: { label: 'Test' } });

    const updated = store.getPanelById('update');
    expect(updated?.isVisible).toBe(false);
    expect(updated?.props).toMatchObject({ label: 'Test' });
  });

  it('reconciles responsive state when screen size changes', () => {
    const store = createPanelRegistryStore();
    const panel = createPanel('responsive-change', 'top-left', {
      config: {
        id: 'responsive-change',
        zone: 'top-left',
        responsive: { hideOnMobile: true, collapseOnMobile: true }
      }
    });

    store.registerPanel(panel, { screenSize: 'desktop' });
    expect(store.getPanelById('responsive-change')?.isVisible).toBe(true);

    store.reconcileResponsiveState('mobile');
    const reconciled = store.getPanelById('responsive-change');
    expect(reconciled?.isVisible).toBe(false);
    expect(reconciled?.isCollapsed).toBe(true);
  });

  it('returns panels sorted by priority for a zone', () => {
    const store = createPanelRegistryStore();
    store.registerPanel(
      createPanel('low', 'top-left', { config: { id: 'low', zone: 'top-left', priority: 1 } }),
      { screenSize: 'desktop' }
    );
    store.registerPanel(
      createPanel('high', 'top-left', { config: { id: 'high', zone: 'top-left', priority: 10 } }),
      { screenSize: 'desktop' }
    );

    const panels = store.getPanelsForZone('top-left');
    expect(panels.map(p => p.config.id)).toEqual(['high', 'low']);
  });
});
