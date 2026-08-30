import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatCurrencyInput,
  formatNumber,
  formatPercent,
  parseCurrencyInput,
} from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts with a dollar sign and two decimals', () => {
      assert.equal(formatCurrency(1234.5), '$1,234.50');
    });

    it('formats negative amounts with a leading minus', () => {
      assert.equal(formatCurrency(-50), '-$50.00');
    });

    it('formats zero', () => {
      assert.equal(formatCurrency(0), '$0.00');
    });

    it('rounds to two decimals', () => {
      assert.equal(formatCurrency(0.999), '$1.00');
    });
  });

  describe('parseCurrencyInput', () => {
    it('returns the numeric value for a plain number', () => {
      assert.equal(parseCurrencyInput('1234.50'), 1234.5);
    });

    it('strips dollar signs and commas', () => {
      assert.equal(parseCurrencyInput('$1,234.50'), 1234.5);
    });

    it('returns null for empty or invalid input', () => {
      assert.equal(parseCurrencyInput(''), null);
      assert.equal(parseCurrencyInput('abc'), null);
      assert.equal(parseCurrencyInput('1.2.3'), null);
    });
  });

  describe('formatCurrencyInput', () => {
    it('shows two decimals for a number', () => {
      assert.equal(formatCurrencyInput(12.5), '12.50');
    });

    it('returns empty string for null', () => {
      assert.equal(formatCurrencyInput(null), '');
    });
  });

  describe('formatNumber', () => {
    it('formats with commas and two decimals', () => {
      assert.equal(formatNumber(1234.5), '1,234.50');
    });

    it('shows a leading minus for negatives', () => {
      assert.equal(formatNumber(-5), '-5.00');
    });
  });

  describe('formatPercent', () => {
    it('appends a percent sign', () => {
      assert.equal(formatPercent(50), '50%');
    });
  });
});
