/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind v4: Rely on CSS-first @theme tokens in globals.css
  theme: {
    extend: {
      colors: {
        // Design System Colors
        'background-primary': 'var(--color-background-primary)',
        'background-secondary': 'var(--color-background-secondary)',
        'background-tertiary': 'var(--color-background-tertiary)',
        'background-input': 'var(--color-background-input)',
        'background-card': 'var(--color-background-card)',
        'background-popover': 'var(--color-background-popover)',
        
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'text-error': 'var(--color-text-error)',
        'text-success': 'var(--color-text-success)',
        'text-warning': 'var(--color-text-warning)',
        
        'border-primary': 'var(--color-border-primary)',
        'border-secondary': 'var(--color-border-secondary)',
        'border-input': 'var(--color-border-input)',
        
        'interactive-primary': 'var(--color-interactive-primary)',
        'interactive-primary-hover': 'var(--color-interactive-primary-hover)',
        'interactive-primary-active': 'var(--color-interactive-primary-active)',
        'interactive-secondary': 'var(--color-interactive-secondary)',
        'interactive-secondary-hover': 'var(--color-interactive-secondary-hover)',
        'interactive-secondary-active': 'var(--color-interactive-secondary-active)',
        
        'status-success': 'var(--color-status-success)',
        'status-success-border': 'var(--color-status-success-border)',
        'status-error': 'var(--color-status-error)',
        'status-error-border': 'var(--color-status-error-border)',
        'status-warning': 'var(--color-status-warning)',
        'status-warning-border': 'var(--color-status-warning-border)',
        'status-info': 'var(--color-status-info)',
        'status-info-border': 'var(--color-status-info-border)',
        
        // Legacy colors for compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: 'hsl(var(--ring))',
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      ringOffsetColor: {
        DEFAULT: 'hsl(var(--background))',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  // Plugins are declared via @plugin in CSS for v4; no JS plugins needed here
};