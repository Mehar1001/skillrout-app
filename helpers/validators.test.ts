import assert from 'node:assert/strict';
import { test } from 'node:test';
import dayjs from 'dayjs';
import { isPositiveNumber, validateBusinessDate, validatePercentages, validatePresentReading } from './validators';

test('isPositiveNumber accepts valid non-negative numbers', () => {
  assert.equal(isPositiveNumber('0'), true);
  assert.equal(isPositiveNumber('100'), true);
  assert.equal(isPositiveNumber('1234.56'), true);
  assert.equal(isPositiveNumber(''), false);
  assert.equal(isPositiveNumber('-1'), false);
  assert.equal(isPositiveNumber('abc'), false);
  assert.equal(isPositiveNumber('10.5.5'), false);
});

test('validatePresentReading requires value and not below baseline', () => {
  assert.equal(validatePresentReading(null, 1000, 'Credits In'), 'Credits In is required.');
  assert.equal(validatePresentReading(1000, 1000, 'Credits In'), null);
  assert.equal(validatePresentReading(1001, 1000, 'Credits In'), null);
  assert.equal(
    validatePresentReading(999, 1000, 'Credits In'),
    'Credits In must be equal to or greater than the last settled value.'
  );
  assert.equal(validatePresentReading(700, 500, 'Total Paid'), null);
  assert.equal(
    validatePresentReading(499, 500, 'Total Paid'),
    'Total Paid must be equal to or greater than the last settled value.'
  );
});

test('validateBusinessDate accepts today and the previous seven days', () => {
  const today = dayjs().format('YYYY-MM-DD');
  assert.equal(validateBusinessDate(today), null);
  assert.equal(validateBusinessDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD')), null);
  assert.equal(validateBusinessDate(dayjs().subtract(7, 'day').format('YYYY-MM-DD')), null);
});

test('validateBusinessDate rejects future and too-old dates', () => {
  assert.equal(
    validateBusinessDate(dayjs().add(1, 'day').format('YYYY-MM-DD')),
    'Future business dates are not allowed.'
  );
  assert.equal(
    validateBusinessDate(dayjs().subtract(8, 'day').format('YYYY-MM-DD')),
    'Business date must be within the previous seven days.'
  );
});

test('validateBusinessDate rejects invalid strings', () => {
  assert.equal(validateBusinessDate('not-a-date'), 'Select a valid business date.');
});

test('validatePercentages requires non-negative 100% total', () => {
  assert.equal(validatePercentages(50, 50), null);
  assert.equal(validatePercentages(0, 100), null);
  assert.equal(validatePercentages(100, 0), null);
  assert.equal(validatePercentages(35, 65), null);
  assert.equal(validatePercentages(50, 40), 'Store % and Games % must add up to 100.');
  assert.equal(validatePercentages(50, 60), 'Store % and Games % must add up to 100.');
  assert.equal(validatePercentages(-10, 110), 'Percentages cannot be negative.');
});
