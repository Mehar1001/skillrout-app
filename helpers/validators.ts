import { colors } from '../constants/designTokens';

export const isPositiveNumber = (value: string): boolean => {
  const n = Number(value);
  return !isNaN(n) && n >= 0 && !isNaN(parseFloat(value));
};

export const validatePercentages = (store: number, vendor: number): string | null => {
  if (store < 0 || vendor < 0) return 'Percentages cannot be negative.';
  if (store + vendor !== 100) return 'Store % and Vendor % must add up to 100.';
  return null;
};

export const resultColor = (result: 'positive' | 'zero' | 'negative') => {
  if (result === 'positive') return colors.success;
  if (result === 'negative') return colors.error;
  return colors.textMuted;
};
