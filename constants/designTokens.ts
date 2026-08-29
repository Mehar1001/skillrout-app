// Skillrout — shadcn-inspired white/blue/black design tokens
// White-dominant light mode, deep slate dark mode.
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
  primary: '#3B82F6',
  primaryHover: '#60A5FA',
  primarySubtle: 'rgba(59, 130, 246, 0.16)',

  accent: '#1E293B',
  accentDark: '#0F172A',
  accentHover: '#334155',
  accentSubtle: 'rgba(30, 41, 59, 0.5)',

  background: '#020617',
  surface: '#0F172A',
  surfaceSecondary: '#1E293B',
  border: '#1E293B',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#F8FAFC',

  success: '#22C55E',
  error: '#F87171',
  warning: '#FBBF24',
  info: '#38BDF8',

  glowPrimary: 'rgba(59, 130, 246, 0.25)',
  glowAccent: 'rgba(248, 250, 252, 0.08)',
  glowSuccess: 'rgba(34, 197, 94, 0.25)',
  glowError: 'rgba(248, 113, 113, 0.25)',
} as const;

export const lightColors = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primarySubtle: 'rgba(37, 99, 235, 0.08)',

  accent: '#F1F5F9',
  accentDark: '#E2E8F0',
  accentHover: '#E2E8F0',
  accentSubtle: 'rgba(241, 245, 249, 0.5)',

  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#0F172A',

  success: '#16A34A',
  error: '#DC2626',
  warning: '#D97706',
  info: '#0EA5E9',

  glowPrimary: 'rgba(37, 99, 235, 0.10)',
  glowAccent: 'rgba(15, 23, 42, 0.04)',
  glowSuccess: 'rgba(22, 163, 74, 0.10)',
  glowError: 'rgba(220, 38, 38, 0.10)',
} as const;

export type Colors = typeof lightColors | typeof darkColors;

// Convenience for components that are not yet theme-aware.
// For full dark/light support, prefer `useColors()` from `hooks/useColors`.
export const colors: Colors = lightColors;

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
