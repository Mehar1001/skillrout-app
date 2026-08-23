import dayjs from 'dayjs';
import { colors } from '../constants/designTokens';

export const isPositiveNumber = (value: string): boolean => {
  const n = Number(value);
  return !isNaN(n) && n >= 0 && !isNaN(parseFloat(value));
};

export const validatePresentReading = (
  present: number | null,
  lastSettled: number,
  label: string
): string | null => {
  if (present === null) return `${label} is required.`;
  if (present < lastSettled) {
    return `${label} must be equal to or greater than the last settled value.`;
  }
  return null;
};

export const validateBusinessDate = (businessDate: string): string | null => {
  const selected = dayjs(businessDate).startOf('day');
  const today = dayjs().startOf('day');
  const earliest = today.subtract(7, 'day');
  if (!selected.isValid()) return 'Select a valid business date.';
  if (selected.isAfter(today)) return 'Future business dates are not allowed.';
  if (selected.isBefore(earliest)) return 'Business date must be within the previous seven days.';
  return null;
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
