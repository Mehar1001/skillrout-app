import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMachineNumber, parseReceiptText } from './receiptOcr.js';

const sample = `
Book Keeping
< 1>
Credits In == 3644.00
Total Paid == 1925.00
< 2>
Credits In == 3344.00
Total Paid == 8270.00
< 3>
Credits In == 3767.00
Total Paid == 3940.00
< 4>
Credits In == 2837.00
Total Paid == 1710.00
< 5>
Credits In == 8286.00
Total Paid == 5135.00
Machine Totals
Money Out == 20980.00
Money In == 21878.00
`;

test('parses numbered receipt rows and verifies totals', () => {
  const result = parseReceiptText(sample, 0.91);
  assert.equal(result.candidates.length, 5);
  assert.deepEqual(
    result.candidates.map(candidate => [candidate.receiptMachineNumber, candidate.presentIn, candidate.presentOut]),
    [
      ['1', 3644, 1925],
      ['2', 3344, 8270],
      ['3', 3767, 3940],
      ['4', 2837, 1710],
      ['5', 8286, 5135],
    ]
  );
  assert.equal(result.totals.moneyIn, 21878);
  assert.equal(result.totals.moneyOut, 20980);
  assert.equal(result.totals.inMatches, true);
  assert.equal(result.totals.outMatches, true);
});

test('normalizes leading zero machine numbers', () => {
  assert.equal(normalizeMachineNumber(' < 001 > '), '1');
});

test('does not infer missing fields from totals', () => {
  const result = parseReceiptText('<1>\nCredits In == 100.00\nMachine Totals\nMoney In == 100.00\nMoney Out == 50.00');
  assert.equal(result.candidates[0].presentOut, null);
  assert.equal(result.candidates[0].warnings.includes('Total Paid was not found.'), true);
});

test('uses the target machine for a single unnumbered image', () => {
  const result = parseReceiptText('Credits In == 1234.00\nTotal Paid == 900.00', 0.8, '0098');
  assert.deepEqual(result.candidates[0], {
    receiptMachineNumber: '98',
    presentIn: 1234,
    presentOut: 900,
    confidence: 0.8,
    warnings: [],
  });
});
