import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { HUDZone } from './HUDLayoutSystem';
import { useHUDPanelRegistry } from './HUDPanelRegistry';

// Accessibility configuration
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

// Default accessibility configuration
const DEFAULT_ACCESSIBILITY_CONFIG: HUDAccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReader: true,
  enableHighContrast: false,
  enableReducedMotion: false,
  focusManagement: {
    trapFocus: false,
    restoreFocus: true,
    skipToContent: true
  },
  announcements: {
    panelChanges: true,
    resourceUpdates: false,
    gameEvents: true
  }
};

// Accessibility context
interface HUDAccessibilityContextType {
  config: HUDAccessibilityConfig;
  updateConfig: (updates: Partial<HUDAccessibilityConfig>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusPanel: (panelId: string) => void;
  focusZone: (zone: HUDZone) => void;
  registerFocusableElement: (id: string, element: HTMLElement, zone: HUDZone) => void;
  unregisterFocusableElement: (id: string) => void;
  getNextFocusableElement: (currentId: string, direction: 'next' | 'previous') => HTMLElement | null;
}

const HUDAccessibilityContext = createContext<HUDAccessibilityContextType | null>(null);

export function useHUDAccessibility() {
  const context = useContext(HUDAccessibilityContext);
  if (!context) {
    throw new Error('useHUDAccessibility must be used within a HUDAccessibilityProvider');
  }
  return context;
}

// Focusable element registry
interface FocusableElement {
  id: string;
  element: HTMLElement;
  zone: HUDZone;
  tabIndex: number;
}

interface HUDAccessibilityProviderProps {
  children: ReactNode;
  config?: Partial<HUDAccessibilityConfig>;
}

export function HUDAccessibilityProvider({ children, config: userConfig = {} }: HUDAccessibilityProviderProps) {
  const [config, setConfig] = useState<HUDAccessibilityConfig>({
    ...DEFAULT_ACCESSIBILITY_CONFIG,
    ...userConfig
  });
  
  const [focusableElements, setFocusableElements] = useState<Map<string, FocusableElement>>(new Map());
  const announcementRef = useRef<HTMLDivElement>(null);
  const lastFocusedElement = useRef<HTMLElement | null>(null);

  // Load accessibility preferences from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('hud-accessibility-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to load accessibility config:', error);
      }
    }
  }, []);

  // Save accessibility preferences to localStorage
  useEffect(() => {
    localStorage.setItem('hud-accessibility-config', JSON.stringify(config));
  }, [config]);

  // Apply accessibility styles based on configuration
  useEffect(() => {
    const root = document.documentElement;
    
    if (config.enableHighContrast) {
      root.classList.add('hud-high-contrast');
    } else {
      root.classList.remove('hud-high-contrast');
    }
    
    if (config.enableReducedMotion) {
      root.classList.add('hud-reduced-motion');
    } else {
      root.classList.remove('hud-reduced-motion');
    }
  }, [config.enableHighContrast, config.enableReducedMotion]);

  // Keyboard navigation handler
  useEffect(() => {
    if (!config.enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, altKey, shiftKey } = event;
      
      // Skip to content shortcut (Alt + S)
      if (altKey && key === 's' && config.focusManagement.skipToContent) {
        event.preventDefault();
        const mainContent = document.querySelector('[role="main"]') as HTMLElement;
        if (mainContent) {
          mainContent.focus();
          announceToScreenReader('Skipped to main content');
        }
        return;
      }

      // Panel navigation shortcuts (Ctrl + Arrow keys)
      if (ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        event.preventDefault();
        handlePanelNavigation(key);
        return;
      }

      // Tab navigation within HUD
      if (key === 'Tab') {
        handleTabNavigation(event);
      }

      // Escape key to exit focus trap
      if (key === 'Escape' && config.focusManagement.trapFocus) {
        event.preventDefault();
        if (config.focusManagement.restoreFocus && lastFocusedElement.current) {
          lastFocusedElement.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.enableKeyboardNavigation, config.focusManagement, focusableElements]);

  const updateConfig = (updates: Partial<HUDAccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!config.enableScreenReader || !announcementRef.current) return;
    
    const announcement = announcementRef.current;
    announcement.setAttribute('aria-live', priority);
    announcement.textContent = message;
    
    // Clear the announcement after a short delay to allow for re-announcements
    setTimeout(() => {
      if (announcement.textContent === message) {
        announcement.textContent = '';
      }
    }, 1000);
  };

  const registerFocusableElement = (id: string, element: HTMLElement, zone: HUDZone) => {
    setFocusableElements(prev => {
      const newMap = new Map(prev);
      newMap.set(id, {
        id,
        element,
        zone,
        tabIndex: element.tabIndex || 0
      });
      return newMap;
    });
  };

  const unregisterFocusableElement = (id: string) => {
    setFocusableElements(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const focusPanel = (panelId: string) => {
    const element = focusableElements.get(panelId);
    if (element) {
      element.element.focus();
      if (config.announcements.panelChanges) {
        announceToScreenReader(`Focused on ${panelId} panel`);
      }
    }
  };

  const focusZone = (zone: HUDZone) => {
    const elementsInZone = Array.from(focusableElements.values())
      .filter(el => el.zone === zone)
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    if (elementsInZone.length > 0) {
      elementsInZone[0].element.focus();
      if (config.announcements.panelChanges) {
        announceToScreenReader(`Focused on ${zone} zone`);
      }
    }
  };

  const getNextFocusableElement = (currentId: string, direction: 'next' | 'previous'): HTMLElement | null => {
    const elements = Array.from(focusableElements.values())
      .sort((a, b) => a.tabIndex - b.tabIndex);
    
    const currentIndex = elements.findIndex(el => el.id === currentId);
    if (currentIndex === -1) return null;
    
    const nextIndex = direction === 'next' 
      ? (currentIndex + 1) % elements.length
      : (currentIndex - 1 + elements.length) % elements.length;
    
    return elements[nextIndex]?.element || null;
  };

  const handlePanelNavigation = (key: string) => {
    const currentFocus = document.activeElement as HTMLElement;
    const currentElement = Array.from(focusableElements.values())
      .find(el => el.element === currentFocus);
    
    if (!currentElement) return;
    
    const { zone } = currentElement;
    let targetZone: HUDZone | null = null;
    
    // Determine target zone based on arrow key and current zone
    switch (key) {
      case 'ArrowUp':
        if (zone.includes('bottom')) targetZone = zone.replace('bottom', 'middle') as HUDZone;
        else if (zone.includes('middle')) targetZone = zone.replace('middle', 'top') as HUDZone;
        break;
      case 'ArrowDown':
        if (zone.includes('top')) targetZone = zone.replace('top', 'middle') as HUDZone;
        else if (zone.includes('middle')) targetZone = zone.replace('middle', 'bottom') as HUDZone;
        break;
      case 'ArrowLeft':
        if (zone.includes('right')) targetZone = zone.replace('right', 'center') as HUDZone;
        else if (zone.includes('center')) targetZone = zone.replace('center', 'left') as HUDZone;
        break;
      case 'ArrowRight':
        if (zone.includes('left')) targetZone = zone.replace('left', 'center') as HUDZone;
        else if (zone.includes('center')) targetZone = zone.replace('center', 'right') as HUDZone;
        break;
    }
    
    if (targetZone) {
      focusZone(targetZone);
    }
  };

  const handleTabNavigation = (event: KeyboardEvent) => {
    if (!config.focusManagement.trapFocus) return;
    
    const focusableInHUD = Array.from(focusableElements.values())
      .map(el => el.element)
      .filter(el => el.offsetParent !== null); // Only visible elements
    
    if (focusableInHUD.length === 0) return;
    
    const firstElement = focusableInHUD[0];
    const lastElement = focusableInHUD[focusableInHUD.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  const contextValue: HUDAccessibilityContextType = {
    config,
    updateConfig,
    announceToScreenReader,
    focusPanel,
    focusZone,
    registerFocusableElement,
    unregisterFocusableElement,
    getNextFocusableElement
  };

  return (
    <HUDAccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Screen reader announcements */}
      <div
        ref={announcementRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      {/* Skip to content link */}
      {config.focusManagement.skipToContent && (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-gray-900 focus:text-white focus:px-4 focus:py-2 focus:rounded"
          onFocus={() => lastFocusedElement.current = document.activeElement as HTMLElement}
        >
          Skip to main content
        </a>
      )}
    </HUDAccessibilityContext.Provider>
  );
}

// Accessible HUD Panel wrapper
interface AccessibleHUDPanelProps {
  children: ReactNode;
  panelId: string;
  zone: HUDZone;
  title: string;
  description?: string;
  role?: string;
  className?: string;
}

export function AccessibleHUDPanel({
  children,
  panelId,
  zone,
  title,
  description,
  role = 'region',
  className = ''
}: AccessibleHUDPanelProps) {
  const { config, registerFocusableElement, unregisterFocusableElement } = useHUDAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current && config.enableKeyboardNavigation) {
      registerFocusableElement(panelId, panelRef.current, zone);
      return () => unregisterFocusableElement(panelId);
    }
  }, [panelId, zone, config.enableKeyboardNavigation]);

  return (
    <div
      ref={panelRef}
      className={`hud-panel ${className}`}
      role={role}
      aria-label={title}
      aria-describedby={description ? `${panelId}-description` : undefined}
      tabIndex={config.enableKeyboardNavigation ? 0 : -1}
    >
      {description && (
        <div id={`${panelId}-description`} className="sr-only">
          {description}
        </div>
      )}
      {children}
    </div>
  );
}

// Accessible button component for HUD
interface AccessibleHUDButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function AccessibleHUDButton({
  children,
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  variant = 'primary'
}: AccessibleHUDButtonProps) {
  const { config, announceToScreenReader } = useHUDAccessibility();

  const handleClick = () => {
    if (!disabled) {
      onClick();
      if (config.announcements.panelChanges && ariaLabel) {
        announceToScreenReader(`${ariaLabel} activated`);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  };

  return (
    <button
      className={`
        px-3 py-2 text-white rounded transition-colors
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      type="button"
    >
      {children}
    </button>
  );
}

export default HUDAccessibilityProvider;