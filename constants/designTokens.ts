// Skillrout — Earthy design tokens
// Primary clay is derived from a warm, muted terracotta/sand tone.
// Accent is a hue rotation of ~137.5° from primary, yielding a sage/teal.
// Background and neutrals are produced by desaturating primary.

export const colors = {
  primary: '#8C6E5F',
  primaryHover: '#785C4F',
  primarySubtle: 'rgba(140, 110, 95, 0.08)',

  accent: '#5F8C7B',
  accentDark: '#3E5F53',
  accentHover: '#4E7466',
  accentSubtle: 'rgba(95, 140, 123, 0.08)',

  background: '#F4F1EA',
  surface: '#FFFDFB',
  surfaceSecondary: '#EBE7DF',
  border: '#DCD7CD',

  textPrimary: '#2D2A26',
  textSecondary: '#5C5750',
  textMuted: '#8A857C',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  success: '#5F8C7B',
  error: '#C45A4A',
  warning: '#C9A05C',
  info: '#6E8CA3',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 13,
  lg: 21,
  xl: 34,
  xxl: 55,
} as const;

export const fontSizes = {
  caption: 12,
  body: 14,
  h3: 16,
  h2: 21,
  h1: 34,
  display: 55,
} as const;

export const lineHeights = {
  caption: 16,
  body: 20,
  h3: 22,
  h2: 28,
  h1: 42,
  display: 64,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const shadows = {
  none: undefined,
  subtle: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  elevated: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
