/**
 * Theme Configuration
 * Defines light and dark theme variations using design tokens
 */

import { colors, semanticTokens } from './tokens';

export interface Theme {
  name: string;
  colors: {
    // Background colors
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      elevated: string;
      overlay: string;
    };
    
    // Text colors
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
      disabled: string;
      link: string;
      'link-hover': string;
    };
    
    // Border colors
    border: {
      primary: string;
      secondary: string;
      tertiary: string;
      focus: string;
      error: string;
      success: string;
      warning: string;
      info: string;
    };
    
    // Interactive colors
    interactive: {
      primary: string;
      'primary-hover': string;
      'primary-active': string;
      'primary-disabled': string;
      secondary: string;
      'secondary-hover': string;
      'secondary-active': string;
      'secondary-disabled': string;
      tertiary: string;
      'tertiary-hover': string;
      'tertiary-active': string;
      destructive: string;
      'destructive-hover': string;
      'destructive-active': string;
    };
    
    // Status colors
    status: {
      error: string;
      'error-bg': string;
      'error-border': string;
      'error-text': string;
      success: string;
      'success-bg': string;
      'success-border': string;
      'success-text': string;
      warning: string;
      'warning-bg': string;
      'warning-border': string;
      'warning-text': string;
      info: string;
      'info-bg': string;
      'info-border': string;
      'info-text': string;
    };
    
    // Component-specific colors
    card: {
      background: string;
      border: string;
      shadow: string;
    };
    
    input: {
      background: string;
      border: string;
      'border-focus': string;
      placeholder: string;
    };
    
    popover: {
      background: string;
      border: string;
      shadow: string;
    };
  };
}

// Light theme configuration
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: {
      primary: colors.white,
      secondary: colors.gray[50],
      tertiary: colors.gray[100],
      inverse: colors.gray[900],
      elevated: colors.white,
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    text: {
      primary: colors.gray[900],
      secondary: colors.gray[700],
      tertiary: colors.gray[500],
      inverse: colors.white,
      disabled: colors.gray[400],
      link: colors.blue[600],
      'link-hover': colors.blue[700],
    },
    
    border: {
      primary: colors.gray[200],
      secondary: colors.gray[300],
      tertiary: colors.gray[100],
      focus: colors.blue[500],
      error: colors.red[500],
      success: colors.green[500],
      warning: colors.yellow[500],
      info: colors.blue[500],
    },
    
    interactive: {
      primary: colors.blue[600],
      'primary-hover': colors.blue[700],
      'primary-active': colors.blue[800],
      'primary-disabled': colors.gray[300],
      secondary: colors.gray[100],
      'secondary-hover': colors.gray[200],
      'secondary-active': colors.gray[300],
      'secondary-disabled': colors.gray[100],
      tertiary: colors.white,
      'tertiary-hover': colors.gray[50],
      'tertiary-active': colors.gray[100],
      destructive: colors.red[600],
      'destructive-hover': colors.red[700],
      'destructive-active': colors.red[800],
    },
    
    status: {
      error: colors.red[600],
      'error-bg': colors.red[50],
      'error-border': colors.red[200],
      'error-text': colors.red[700],
      success: colors.green[600],
      'success-bg': colors.green[50],
      'success-border': colors.green[200],
      'success-text': colors.green[700],
      warning: colors.yellow[600],
      'warning-bg': colors.yellow[50],
      'warning-border': colors.yellow[200],
      'warning-text': colors.yellow[700],
      info: colors.blue[600],
      'info-bg': colors.blue[50],
      'info-border': colors.blue[200],
      'info-text': colors.blue[700],
    },
    
    card: {
      background: colors.white,
      border: colors.gray[200],
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
    
    input: {
      background: colors.white,
      border: colors.gray[300],
      'border-focus': colors.blue[500],
      placeholder: colors.gray[400],
    },
    
    popover: {
      background: colors.white,
      border: colors.gray[200],
      shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
};

// Dark theme configuration
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: {
      primary: colors.gray[900],
      secondary: colors.gray[800],
      tertiary: colors.gray[700],
      inverse: colors.white,
      elevated: colors.gray[800],
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    
    text: {
      primary: colors.gray[100],
      secondary: colors.gray[300],
      tertiary: colors.gray[400],
      inverse: colors.gray[900],
      disabled: colors.gray[600],
      link: colors.blue[400],
      'link-hover': colors.blue[300],
    },
    
    border: {
      primary: colors.gray[700],
      secondary: colors.gray[600],
      tertiary: colors.gray[800],
      focus: colors.blue[400],
      error: colors.red[400],
      success: colors.green[400],
      warning: colors.yellow[400],
      info: colors.blue[400],
    },
    
    interactive: {
      primary: colors.blue[500],
      'primary-hover': colors.blue[400],
      'primary-active': colors.blue[600],
      'primary-disabled': colors.gray[700],
      secondary: colors.gray[700],
      'secondary-hover': colors.gray[600],
      'secondary-active': colors.gray[500],
      'secondary-disabled': colors.gray[800],
      tertiary: colors.gray[800],
      'tertiary-hover': colors.gray[700],
      'tertiary-active': colors.gray[600],
      destructive: colors.red[500],
      'destructive-hover': colors.red[400],
      'destructive-active': colors.red[600],
    },
    
    status: {
      error: colors.red[400],
      'error-bg': colors.red[950],
      'error-border': colors.red[800],
      'error-text': colors.red[300],
      success: colors.green[400],
      'success-bg': colors.green[950],
      'success-border': colors.green[800],
      'success-text': colors.green[300],
      warning: colors.yellow[400],
      'warning-bg': colors.yellow[950],
      'warning-border': colors.yellow[800],
      'warning-text': colors.yellow[300],
      info: colors.blue[400],
      'info-bg': colors.blue[950],
      'info-border': colors.blue[800],
      'info-text': colors.blue[300],
    },
    
    card: {
      background: colors.gray[800],
      border: colors.gray[700],
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
    },
    
    input: {
      background: colors.gray[800],
      border: colors.gray[600],
      'border-focus': colors.blue[400],
      placeholder: colors.gray[500],
    },
    
    popover: {
      background: colors.gray[800],
      border: colors.gray[700],
      shadow: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
    },
  },
};

// Theme registry
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;

// CSS custom properties generator
export function generateCSSCustomProperties(theme: Theme): Record<string, string> {
  const cssVars: Record<string, string> = {};
  
  // Helper function to flatten nested objects
  function flattenObject(obj: any, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const cssKey = prefix ? `${prefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        flattenObject(value, cssKey);
      } else {
        cssVars[`--color-${cssKey}`] = value as string;
      }
    }
  }
  
  flattenObject(theme.colors);
  
  return cssVars;
}

// Utility to get theme-aware color values
export function getThemeColor(theme: Theme, colorPath: string): string {
  const keys = colorPath.split('.');
  let value: any = theme.colors;
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || '';
}

// Default theme
export const defaultTheme = lightTheme;