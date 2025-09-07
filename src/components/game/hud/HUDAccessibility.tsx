import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { HUDZone } from './HUDLayoutSystem';
import {
  HUDAccessibilityConfig,
  DEFAULT_ACCESSIBILITY_CONFIG,
} from './accessibility/config';
import { useScreenReaderAnnouncer } from './accessibility/announce';
import { useFocusManagement } from './accessibility/focus';

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

interface HUDAccessibilityProviderProps {
  children: ReactNode;
  config?: Partial<HUDAccessibilityConfig>;
}

export function HUDAccessibilityProvider({ children, config: userConfig = {} }: HUDAccessibilityProviderProps) {
  const [config, setConfig] = useState<HUDAccessibilityConfig>({
    ...DEFAULT_ACCESSIBILITY_CONFIG,
    ...userConfig,
  });

  const { announcementRef, announceToScreenReader } =
    useScreenReaderAnnouncer(config);

  const {
    registerFocusableElement,
    unregisterFocusableElement,
    focusPanel,
    focusZone,
    getNextFocusableElement,
    lastFocusedElement,
  } = useFocusManagement(config, announceToScreenReader);

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

  const updateConfig = (updates: Partial<HUDAccessibilityConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const contextValue: HUDAccessibilityContextType = {
    config,
    updateConfig,
    announceToScreenReader,
    focusPanel,
    focusZone,
    registerFocusableElement,
    unregisterFocusableElement,
    getNextFocusableElement,
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
          onFocus={() =>
            (lastFocusedElement.current = document.activeElement as HTMLElement)
          }
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
  }, [
    panelId,
    zone,
    config.enableKeyboardNavigation,
    registerFocusableElement,
    unregisterFocusableElement,
  ]);

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
