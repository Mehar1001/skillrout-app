import { darkColors, lightColors, type Colors } from '@/constants/designTokens';

// Defaulting to light mode for the financial-institution white-dominant UI.
// Dark colors are still exported from design tokens for future use.
export const useColors = (): Colors => {
  return lightColors as Colors;
};
