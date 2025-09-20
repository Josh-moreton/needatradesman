// Enterprise Design System Configuration
// Professional design tokens for NeedATradesman platform

export const designSystem = {
  // Professional Typography Scale
  typography: {
    fontFamilies: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      heading: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'Cascadia Code', 'Source Code Pro', 'monospace'],
    },
    scale: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem', // 60px
      '7xl': '4.5rem',  // 72px
      '8xl': '6rem',    // 96px
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Professional Color Palette
  colors: {
    // Brand Colors
    brand: {
      primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#2E6B83', // Main brand color
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
      secondary: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#E9A928', // Accent gold
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
        900: '#713f12',
      },
      tertiary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#1C2E3A', // Dark navy
      },
    },

    // Semantic Colors
    semantic: {
      success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      },
      warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
      },
      error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
      },
      info: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
    },

    // Neutral Grays
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },

  // Professional Spacing Scale (8px grid)
  spacing: {
    0: '0px',
    px: '1px',
    0.5: '2px',
    1: '4px',
    1.5: '6px',
    2: '8px',
    2.5: '10px',
    3: '12px',
    3.5: '14px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px',
  },

  // Professional Shadow System
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    // Professional card shadows
    card: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    // Premium shadows
    premium: '0 20px 25px -5px rgb(46 107 131 / 0.1), 0 8px 10px -6px rgb(46 107 131 / 0.1)',
  },

  // Professional Border Radius
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    '3xl': '24px',
    full: '9999px',
  },

  // Animation & Transition Settings
  animation: {
    durations: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms',
    },
    easings: {
      linear: 'linear',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Professional easing curves
      'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },

  // Component-specific Design Tokens
  components: {
    button: {
      heights: {
        sm: '32px',
        md: '40px',
        lg: '48px',
        xl: '56px',
      },
      padding: {
        sm: '8px 12px',
        md: '12px 24px',
        lg: '16px 32px',
        xl: '20px 40px',
      },
    },
    card: {
      padding: {
        sm: '16px',
        md: '24px',
        lg: '32px',
      },
      borderRadius: '12px',
      border: '1px solid rgb(229 231 235 / 0.5)',
    },
    input: {
      height: '40px',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid rgb(229 231 235)',
    },
  },

  // Breakpoints for Responsive Design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Layout Grid System
  grid: {
    columns: 12,
    gap: {
      sm: '16px',
      md: '24px',
      lg: '32px',
    },
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1400px',
    },
  },
}

// CSS Custom Properties Generator
export const generateCSSVariables = () => {
  const cssVars: Record<string, string> = {}

  // Generate color variables
  Object.entries(designSystem.colors.brand).forEach(([name, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      cssVars[`--color-${name}-${shade}`] = value
    })
  })

  // Generate spacing variables
  Object.entries(designSystem.spacing).forEach(([key, value]) => {
    cssVars[`--space-${key}`] = value
  })

  // Generate shadow variables
  Object.entries(designSystem.shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value
  })

  return cssVars
}

// Utility Functions
export const getColor = (path: string) => {
  const keys = path.split('.')
  let value: any = designSystem.colors
  
  for (const key of keys) {
    value = value?.[key]
  }
  
  return value
}

export const getSpacing = (key: keyof typeof designSystem.spacing) => {
  return designSystem.spacing[key]
}

export const getShadow = (key: keyof typeof designSystem.shadows) => {
  return designSystem.shadows[key]
}

// Export for use in Tailwind config
export default designSystem