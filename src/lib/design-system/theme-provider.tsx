'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeName, themes, generateCSSCustomProperties, defaultTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme: defaultThemeName = 'light',
  storageKey = 'ui-theme',
  attribute = 'data-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultThemeName);
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = (): ThemeName => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Load theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeName;
    const systemTheme = getSystemTheme();
    
    if (stored && stored in themes) {
      setThemeName(stored);
    } else if (enableSystem) {
      setThemeName(systemTheme);
    }
    
    setMounted(true);
  }, [storageKey, enableSystem]);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setThemeName(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [enableSystem, storageKey]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const theme = themes[themeName];
    
    // Disable transitions temporarily if requested
    if (disableTransitionOnChange) {
      const css = document.createElement('style');
      css.appendChild(
        document.createTextNode(
          `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
        )
      );
      document.head.appendChild(css);
      
      // Force reflow
      (() => window.getComputedStyle(document.body))();
      
      // Re-enable transitions
      setTimeout(() => {
        document.head.removeChild(css);
      }, 1);
    }

    // Set theme attribute
    root.setAttribute(attribute, themeName);
    
    // Apply CSS custom properties
    const cssVars = generateCSSCustomProperties(theme);
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Store theme preference
    localStorage.setItem(storageKey, themeName);
  }, [themeName, mounted, attribute, storageKey, disableTransitionOnChange]);

  const setTheme = (newThemeName: ThemeName) => {
    setThemeName(newThemeName);
  };

  const toggleTheme = () => {
    setThemeName(current => current === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme: themes[themeName],
    themeName,
    setTheme,
    toggleTheme,
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{
        theme: defaultTheme,
        themeName: defaultThemeName,
        setTheme,
        toggleTheme,
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme toggle component
export function ThemeToggle({ className }: { className?: string }) {
  const { themeName, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${themeName === 'light' ? 'dark' : 'light'} theme`}
    >
      {themeName === 'light' ? (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

// Utility hook for theme-aware styling
export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

// CSS-in-JS helper for theme-aware styles
export function createThemeStyles(theme: Theme) {
  return {
    // Background utilities
    bgPrimary: { backgroundColor: theme.colors.background.primary },
    bgSecondary: { backgroundColor: theme.colors.background.secondary },
    bgTertiary: { backgroundColor: theme.colors.background.tertiary },
    
    // Text utilities
    textPrimary: { color: theme.colors.text.primary },
    textSecondary: { color: theme.colors.text.secondary },
    textTertiary: { color: theme.colors.text.tertiary },
    
    // Border utilities
    borderPrimary: { borderColor: theme.colors.border.primary },
    borderSecondary: { borderColor: theme.colors.border.secondary },
    borderFocus: { borderColor: theme.colors.border.focus },
  };
}