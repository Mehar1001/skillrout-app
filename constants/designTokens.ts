// Skillrout — Casino/slot-machine design tokens
// Dual-mode (light/dark) system. Use `useColors()` to access the active palette.

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
  xl: 24,
  pill: 999,
} as const;

// Common non-color token shapes.
export const letterSpacings = {
  tight: -0.3,
  normal: 0,
  wide: 0.5,
  label: 0.8,
  uppercase: 1.2,
} as const;

export const darkColors = {
  primary: '#9B7ED1',
  primaryHover: '#8266B8',
  primarySubtle: 'rgba(155, 126, 209, 0.12)',

  accent: '#F0C82D',
  accentDark: '#B8860B',
  accentHover: '#D4AF37',
  accentSubtle: 'rgba(240, 200, 45, 0.12)',

  background: '#0D0F1A',
  surface: '#161B2E',
  surfaceSecondary: '#1E253A',
  border: '#3D3527',

  textPrimary: '#F4F1EA',
  textSecondary: '#B8B0A3',
  textMuted: '#7A7266',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1A1505',

  success: '#00A86B',
  error: '#FF3B30',
  warning: '#FF9F0A',
  info: '#5AC8FA',

  glowPrimary: 'rgba(155, 126, 209, 0.35)',
  glowAccent: 'rgba(240, 200, 45, 0.35)',
  glowSuccess: 'rgba(0, 168, 107, 0.35)',
  glowError: 'rgba(255, 59, 48, 0.35)',
} as const;

export const lightColors = {
  primary: '#7B5BB8',
  primaryHover: '#6A4CA8',
  primarySubtle: 'rgba(123, 91, 184, 0.08)',

  accent: '#B8860B',
  accentDark: '#8A6A0B',
  accentHover: '#D4AF37',
  accentSubtle: 'rgba(184, 134, 11, 0.08)',

  background: '#F9F5ED',
  surface: '#FFFFFF',
  surfaceSecondary: '#EFEBE2',
  border: '#DCD7CD',

  textPrimary: '#1A1505',
  textSecondary: '#5C5750',
  textMuted: '#8A857C',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  success: '#007A4D',
  error: '#C41E3A',
  warning: '#C27D0A',
  info: '#0A7EA4',

  glowPrimary: 'rgba(123, 91, 184, 0.12)',
  glowAccent: 'rgba(184, 134, 11, 0.12)',
  glowSuccess: 'rgba(0, 122, 77, 0.12)',
  glowError: 'rgba(196, 30, 58, 0.12)',
} as const;

export type Colors = typeof darkColors;

// Convenience for components that are not yet theme-aware.
// For full dark/light support, prefer `useColors()` from `hooks/useColors`.
export const colors = darkColors;

const baseShadows = {
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
} as const;

export const darkShadows = {
  button: {
    ...baseShadows,
    shadowColor: darkColors.glowPrimary,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonAccent: {
    ...baseShadows,
    shadowColor: darkColors.glowAccent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  card: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    ...baseShadows,
    shadowColor: darkColors.glowAccent,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const lightShadows = {
  button: {
    ...baseShadows,
    shadowColor: lightColors.glowPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonAccent: {
    ...baseShadows,
    shadowColor: lightColors.glowAccent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    ...baseShadows,
    shadowColor: lightColors.glowAccent,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;
