import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMachineNumber, parseReceiptText } from '../functions/src/receiptOcr';

describe('receipt OCR parser', () => {
  it('parses numbered machine sections with Credits In and Total Paid', () => {
    const text = [
      '101',
      'Credits In 100.00',
      'Total Paid 50.00',
      '102',
      'Credits In 200.00',
      'Total Paid 75.50',
      'Machine Totals',
      'Money In 300.00',
      'Money Out 125.50',
    ].join('\n');
    const result = parseReceiptText(text, 0.9);
    assert.equal(result.candidates.length, 2);
    assert.equal(result.candidates[0].receiptMachineNumber, '101');
    assert.equal(result.candidates[0].presentIn, 100);
    assert.equal(result.candidates[0].presentOut, 50);
    assert.equal(result.candidates[1].receiptMachineNumber, '102');
    assert.equal(result.candidates[1].presentIn, 200);
    assert.equal(result.candidates[1].presentOut, 75.5);
    assert.equal(result.totals.moneyIn, 300);
    assert.equal(result.totals.moneyOut, 125.5);
    assert.equal(result.totals.inMatches, true);
    assert.equal(result.totals.outMatches, true);
  });

  it('handles comma thousands and European decimal separators', () => {
    const text = [
      '101',
      'Credits In 1,234.56',
      'Total Paid 1.234,56',
      'Machine Totals',
      'Money In 1,234.56',
      'Money Out 1,234.56',
    ].join('\n');
    const result = parseReceiptText(text, 0.9);
    assert.equal(result.candidates[0].presentIn, 1234.56);
    assert.equal(result.candidates[0].presentOut, 1234.56);
    assert.equal(result.totals.inMatches, true);
    assert.equal(result.totals.outMatches, true);
  });

  it('finds amounts on adjacent lines and with alternate labels', () => {
    const text = [
      '101',
      'Money In',
      '150.00',
      'Money Out',
      '25.00',
      '102',
      'Paid In 10.00',
      'Paid 5.00',
    ].join('\n');
    const result = parseReceiptText(text, 0.9);
    assert.equal(result.candidates[0].presentIn, 150);
    assert.equal(result.candidates[0].presentOut, 25);
    assert.equal(result.candidates[1].presentIn, 10);
    assert.equal(result.candidates[1].presentOut, 5);
  });

  it('uses fallback machine number when no sections are found', () => {
    const text = [
      'Credits In 500.00',
      'Total Paid 200.00',
    ].join('\n');
    const result = parseReceiptText(text, 0.9, '5');
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].receiptMachineNumber, '5');
    assert.equal(result.candidates[0].presentIn, 500);
    assert.equal(result.candidates[0].presentOut, 200);
  });

  it('corrects common OCR digit misreads', () => {
    const text = [
      '101',
      'Credits In 1O0.00',
      'Total Paid 5O.00',
    ].join('\n');
    const result = parseReceiptText(text, 0.9);
    assert.equal(result.candidates[0].presentIn, 100);
    assert.equal(result.candidates[0].presentOut, 50);
  });

  it('normalizes machine numbers with brackets and leading zeros', () => {
    assert.equal(normalizeMachineNumber('[0101]'), '101');
    assert.equal(normalizeMachineNumber('  1O1  '), '101');
  });
});
