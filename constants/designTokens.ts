// Skillrout — Tesla-style white/black/red design tokens
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
  primary: '#E82127',
  primaryHover: '#FF3B41',
  primarySubtle: 'rgba(232, 33, 39, 0.14)',

  accent: '#FFFFFF',
  accentDark: '#D0D1D2',
  accentHover: '#E8E8E8',
  accentSubtle: 'rgba(255, 255, 255, 0.10)',

  background: '#000000',
  surface: '#121317',
  surfaceSecondary: '#1B1D22',
  border: '#33363C',

  textPrimary: '#FFFFFF',
  textSecondary: '#B0B2B6',
  textMuted: '#82858A',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#171A20',

  success: '#2FBF5F',
  error: '#FF5A5F',
  warning: '#FF9F0A',
  info: '#5AC8FA',

  glowPrimary: 'rgba(232, 33, 39, 0.35)',
  glowAccent: 'rgba(255, 255, 255, 0.20)',
  glowSuccess: 'rgba(47, 191, 95, 0.35)',
  glowError: 'rgba(255, 90, 95, 0.35)',
} as const;

export const lightColors = {
  primary: '#C41E23',
  primaryHover: '#A8181D',
  primarySubtle: 'rgba(232, 33, 39, 0.08)',

  accent: '#171A20',
  accentDark: '#000000',
  accentHover: '#2F343E',
  accentSubtle: 'rgba(23, 26, 32, 0.06)',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F8F8',
  border: '#E5E5E6',

  textPrimary: '#171A20',
  textSecondary: '#5C5E62',
  textMuted: '#84868A',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  success: '#12823B',
  error: '#B7212A',
  warning: '#B35C00',
  info: '#0A7EA4',

  glowPrimary: 'rgba(196, 30, 35, 0.08)',
  glowAccent: 'rgba(23, 26, 32, 0.06)',
  glowSuccess: 'rgba(18, 130, 59, 0.10)',
  glowError: 'rgba(183, 33, 42, 0.10)',
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
