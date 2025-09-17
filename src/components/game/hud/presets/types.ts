import type { HUDLayoutConfig } from '../HUDLayoutSystem';
import type { HUDPanelConfig } from '../panelRegistryStore';

export interface HUDLayoutPresetIconPath {
  d: string;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit';
  strokeLinejoin?: 'round' | 'bevel' | 'miter' | 'inherit';
  strokeWidth?: number;
}

export interface HUDLayoutPresetIconData {
  viewBox?: string;
  paths: HUDLayoutPresetIconPath[];
}

export interface HUDLayoutPreset {
  id: string;
  name: string;
  description: string;
  icon?: HUDLayoutPresetIconData;
  layout: HUDLayoutConfig;
  panelConfigs: Record<string, Partial<HUDPanelConfig>>;
  panelVariants: Record<string, 'default' | 'compact' | 'minimal'>;
  features: {
    autoHide?: boolean;
    smartCollapse?: boolean;
    contextualPanels?: boolean;
    adaptiveLayout?: boolean;
  };
}

export type HUDLayoutPresetId = HUDLayoutPreset['id'];
