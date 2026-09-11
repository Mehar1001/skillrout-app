export const formatCurrency = (value: number | undefined | null): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '$—';
  const isNegative = numeric < 0;
  const absValue = Math.abs(numeric);
  const parts = absValue.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}$${parts[0]}.${parts[1]}`;
};

export const parseCurrencyInput = (value: string): number | null => {
  const normalized = value.replace(/[$,\s]/g, '');
  if (normalized === '' || normalized === '.') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
};

export const formatCurrencyInput = (value: number | null): string =>
  value === null
    ? ''
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPercent = (value: number): string => `${value}%`;

export const formatNumber = (value: number): string => {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const parts = absValue.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}${parts[0]}.${parts[1]}`;
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date)
    : date;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};
