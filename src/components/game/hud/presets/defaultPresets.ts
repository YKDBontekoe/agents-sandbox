import type { HUDLayoutPreset } from './types';

const strokeDefaults = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

const viewBox = '0 0 24 24';

export const defaultHudPresets: HUDLayoutPreset[] = [
  {
    id: 'default',
    name: 'Default Layout',
    description: 'Balanced layout with all panels visible and accessible',
    icon: {
      viewBox,
      paths: [
        {
          d: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
          ...strokeDefaults,
        },
      ],
    },
    layout: {
      zones: {
        'top-left': { enabled: true, className: 'absolute top-4 left-4 z-40', maxPanels: 2, priority: 8 },
        'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: true, className: 'absolute left-4 top-1/2 -translate-y-1/2 z-40', maxPanels: 2, priority: 7 },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: true, className: 'absolute bottom-4 left-4 z-40', maxPanels: 2, priority: 5 },
        'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 4 },
        'bottom-right': { enabled: true, className: 'absolute bottom-4 right-4 z-40', maxPanels: 2, priority: 3 },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': {
          enabled: true,
          className:
            'absolute top-0 right-0 h-full w-[300px] md:w-[340px] lg:w-[360px] flex flex-col gap-2 md:gap-3 p-3 md:p-4 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800',
          maxPanels: 12,
          priority: 2,
        },
        overlay: { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 },
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['top-center', 'bottom-center', 'sidebar-right', 'overlay'],
        desktop: ['top-left', 'top-center', 'middle-left', 'bottom-center', 'sidebar-right', 'overlay'],
        wide: ['top-left', 'top-center', 'bottom-left', 'bottom-center', 'bottom-right', 'sidebar-right', 'overlay'],
      },
    },
    panelConfigs: {
      resources: { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true },
      'action-panel': { priority: 8 },
      'status-bar': { priority: 7 },
      'top-bar': { priority: 11, persistent: true },
    },
    panelVariants: {
      resources: 'default',
      'time-panel': 'compact',
      'action-panel': 'compact',
      'status-bar': 'default',
      'top-bar': 'default',
    },
    features: {
      autoHide: false,
      smartCollapse: true,
      contextualPanels: false,
      adaptiveLayout: true,
    },
  },
  {
    id: 'compact',
    name: 'Compact Layout',
    description: 'Space-efficient layout with smaller panels and smart collapsing',
    icon: {
      viewBox,
      paths: [
        {
          d: 'M4 6h16M4 10h16M4 14h16M4 18h16',
          ...strokeDefaults,
        },
      ],
    },
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: true, className: 'absolute top-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 10 },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: true, className: 'absolute bottom-4 left-1/2 -translate-x-1/2 z-40', maxPanels: 1, priority: 7 },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': {
          enabled: true,
          className:
            'absolute top-0 right-0 h-full w-[300px] md:w-[340px] lg:w-[360px] flex flex-col gap-2 md:gap-3 p-3 md:p-4 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800',
          maxPanels: 12,
          priority: 6,
        },
        overlay: { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 },
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['top-center', 'sidebar-right', 'overlay'],
        desktop: ['top-center', 'sidebar-right', 'overlay'],
        wide: ['top-center', 'bottom-center', 'sidebar-right', 'overlay'],
      },
    },
    panelConfigs: {
      resources: { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true, responsive: { collapseOnMobile: true } },
      'action-panel': { priority: 8, responsive: { hideOnMobile: true } },
    },
    panelVariants: {
      resources: 'compact',
      'time-panel': 'compact',
      'action-panel': 'compact',
    },
    features: {
      autoHide: true,
      smartCollapse: true,
      contextualPanels: true,
      adaptiveLayout: true,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Layout',
    description: 'Clean, distraction-free layout with only essential information',
    icon: {
      viewBox,
      paths: [
        {
          d: 'M20 12H4',
          ...strokeDefaults,
        },
      ],
    },
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: false, className: '' },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: false, className: '' },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': {
          enabled: true,
          className:
            'absolute top-0 right-0 h-full w-[280px] md:w-[300px] lg:w-[320px] flex flex-col gap-2 md:gap-3 p-3 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800',
          maxPanels: 8,
          priority: 6,
        },
        overlay: { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 },
      },
      responsive: {
        mobile: ['sidebar-right', 'overlay'],
        tablet: ['sidebar-right', 'overlay'],
        desktop: ['sidebar-right', 'overlay'],
        wide: ['sidebar-right', 'overlay'],
      },
    },
    panelConfigs: {
      resources: { priority: 10, persistent: true },
      'time-panel': { priority: 9, persistent: true },
      'action-panel': { priority: 8 },
    },
    panelVariants: {
      resources: 'minimal',
      'time-panel': 'minimal',
      'action-panel': 'minimal',
    },
    features: {
      autoHide: true,
      smartCollapse: false,
      contextualPanels: false,
      adaptiveLayout: true,
    },
  },
  {
    id: 'immersive',
    name: 'Immersive Layout',
    description: 'Maximum screen space for gameplay with auto-hiding panels',
    icon: {
      viewBox,
      paths: [
        {
          d: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
          ...strokeDefaults,
        },
      ],
    },
    layout: {
      zones: {
        'top-left': { enabled: false, className: '' },
        'top-center': { enabled: false, className: '' },
        'top-right': { enabled: false, className: '' },
        'middle-left': { enabled: false, className: '' },
        'middle-center': { enabled: false, className: '' },
        'middle-right': { enabled: false, className: '' },
        'bottom-left': { enabled: false, className: '' },
        'bottom-center': { enabled: false, className: '' },
        'bottom-right': { enabled: false, className: '' },
        'sidebar-left': { enabled: false, className: '' },
        'sidebar-right': {
          enabled: true,
          className:
            'absolute top-0 right-0 h-full w-[280px] md:w-[300px] lg:w-[320px] flex flex-col gap-2 md:gap-3 p-3 overflow-y-auto z-40 bg-gray-900/30 backdrop-blur-md border-l border-gray-800',
          maxPanels: 6,
          priority: 6,
        },
        overlay: { enabled: true, className: 'absolute inset-0 z-50 pointer-events-none', priority: 11 },
      },
      responsive: {
        mobile: ['overlay'],
        tablet: ['sidebar-right', 'overlay'],
        desktop: ['sidebar-right', 'overlay'],
        wide: ['sidebar-right', 'overlay'],
      },
    },
    panelConfigs: {
      resources: { priority: 10, persistent: false },
      'time-panel': { priority: 9, persistent: true },
    },
    panelVariants: {
      resources: 'minimal',
      'time-panel': 'minimal',
    },
    features: {
      autoHide: true,
      smartCollapse: false,
      contextualPanels: true,
      adaptiveLayout: true,
    },
  },
];

export default defaultHudPresets;
