export interface HUDAccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  focusManagement: {
    trapFocus: boolean;
    restoreFocus: boolean;
    skipToContent: boolean;
  };
  announcements: {
    panelChanges: boolean;
    resourceUpdates: boolean;
    gameEvents: boolean;
  };
}

export const DEFAULT_ACCESSIBILITY_CONFIG: HUDAccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReader: true,
  enableHighContrast: false,
  enableReducedMotion: false,
  focusManagement: {
    trapFocus: false,
    restoreFocus: true,
    skipToContent: true,
  },
  announcements: {
    panelChanges: true,
    resourceUpdates: false,
    gameEvents: true,
  },
};
