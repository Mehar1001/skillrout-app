// Skillrout — warm, earthy design tokens
// 60% cream background, 30% olive neutrals, 10% terracotta accent.
// Dual-mode (light/dark) system. Use `useColors()` to access the active palette.

// Fibonacci-based spacing scale (golden-ratio progression).
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
  primary: '#8A9B6B',
  primaryHover: '#A8B58E',
  primarySubtle: 'rgba(138, 155, 107, 0.16)',

  accent: '#D98258',
  accentDark: '#B55A34',
  accentHover: '#E09063',
  accentSubtle: 'rgba(217, 130, 88, 0.16)',

  background: '#1A1F18',
  surface: '#222820',
  surfaceSecondary: '#2A3026',
  border: '#3A4336',

  textPrimary: '#F5F1E8',
  textSecondary: '#B8BFB0',
  textMuted: '#8A8F7E',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  success: '#4ADE80',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#38BDF8',
  overlay: 'rgba(0, 0, 0, 0.56)',

  glowPrimary: 'rgba(138, 155, 107, 0.25)',
  glowAccent: 'rgba(245, 241, 232, 0.08)',
  glowSuccess: 'rgba(74, 222, 128, 0.20)',
  glowError: 'rgba(248, 113, 113, 0.20)',
} as const;

export const lightColors = {
  primary: '#687357',
  primaryHover: '#4E5A3E',
  primarySubtle: 'rgba(104, 115, 87, 0.10)',

  accent: '#C7633D',
  accentDark: '#A5522F',
  accentHover: '#B55A34',
  accentSubtle: 'rgba(199, 99, 61, 0.10)',

  background: '#F5F1E8',
  surface: '#FFFFFF',
  surfaceSecondary: '#ECE7DD',
  border: '#D9D3C7',

  textPrimary: '#283628',
  textSecondary: '#5B6653',
  textMuted: '#8A8F7E',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0EA5E9',
  overlay: 'rgba(0, 0, 0, 0.48)',

  glowPrimary: 'rgba(104, 115, 87, 0.10)',
  glowAccent: 'rgba(40, 54, 40, 0.04)',
  glowSuccess: 'rgba(22, 163, 74, 0.10)',
  glowError: 'rgba(220, 38, 38, 0.10)',
} as const;

export type Colors = typeof lightColors | typeof darkColors;

const baseShadows = {
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 3,
  elevation: 2,
} as const;

export const darkShadows = {
  button: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonAccent: {
    ...baseShadows,
    shadowColor: darkColors.glowAccent,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  card: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 3,
  },
  input: {
    ...baseShadows,
    shadowColor: darkColors.glowAccent,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const lightShadows = {
  button: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonAccent: {
    ...baseShadows,
    shadowColor: lightColors.glowAccent,
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    ...baseShadows,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    ...baseShadows,
    shadowColor: lightColors.glowAccent,
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 1,
  },
} as const;

// Convenience for components that are not yet theme-aware.
// For full dark/light support, prefer `useColors()` from `hooks/useColors`.
export const colors: Colors = lightColors;
