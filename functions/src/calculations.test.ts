import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateMachine, calculateVisit, round2 } from './calculations.js';

test('round2 rounds to two decimals with epsilon correction', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(1.004), 1.0);
  assert.equal(round2(1.235), 1.24);
  assert.equal(round2(1.234), 1.23);
  assert.equal(round2(-1.235), -1.23);
  assert.equal(round2(0), 0);
  assert.equal(round2(1_000_000), 1_000_000);
});

test('calculateMachine positive, zero, and negative net', () => {
  assert.deepEqual(
    calculateMachine({ lastSettledIn: 1000, lastSettledOut: 500 } as any, 1500, 700),
    { newIn: 500, newOut: 200, machineNet: 300 }
  );
  assert.deepEqual(
    calculateMachine({ lastSettledIn: 1000, lastSettledOut: 500 } as any, 1200, 700),
    { newIn: 200, newOut: 200, machineNet: 0 }
  );
  assert.deepEqual(
    calculateMachine({ lastSettledIn: 1000, lastSettledOut: 500 } as any, 1100, 700),
    { newIn: 100, newOut: 200, machineNet: -100 }
  );
  assert.deepEqual(
    calculateMachine({ lastSettledIn: 1000, lastSettledOut: 500 } as any, 1000, 500),
    { newIn: 0, newOut: 0, machineNet: 0 }
  );
  assert.deepEqual(
    calculateMachine({ lastSettledIn: 1_000_000, lastSettledOut: 500_000 } as any, 2_000_000, 1_200_000),
    { newIn: 1_000_000, newOut: 700_000, machineNet: 300_000 }
  );
});

test('calculateVisit positive, zero, and negative with splits', () => {
  const machines = [
    { newIn: 500, newOut: 200 },
    { newIn: 150, newOut: 50 },
  ];
  const positive = calculateVisit(machines, 50);
  assert.equal(positive.totalNewIn, 650);
  assert.equal(positive.totalNewOut, 250);
  assert.equal(positive.totalNet, 400);
  assert.equal(positive.result, 'positive');
  assert.equal(positive.storeAmount, 200);
  assert.equal(positive.vendorAmount, 200);
  assert.equal(positive.cashDueLocation, 450);

  const zero = calculateVisit([{ newIn: 500, newOut: 500 }], 60);
  assert.equal(zero.totalNet, 0);
  assert.equal(zero.result, 'zero');
  assert.equal(zero.storeAmount, 0);
  assert.equal(zero.vendorAmount, 0);
  assert.equal(zero.cashDueLocation, 500);

  const negative = calculateVisit([{ newIn: 500, newOut: 700 }], 60);
  assert.equal(negative.totalNet, -200);
  assert.equal(negative.result, 'negative');
  assert.equal(negative.storeAmount, -120);
  assert.equal(negative.vendorAmount, -80);
  assert.equal(negative.cashDueLocation, 580);
});

test('calculateVisit split variations', () => {
  const machine = { newIn: 1000, newOut: 0 };

  const fullStore = calculateVisit([machine], 100);
  assert.equal(fullStore.storeAmount, 1000);
  assert.equal(fullStore.vendorAmount, 0);
  assert.equal(fullStore.cashDueLocation, 1000);

  const noStore = calculateVisit([machine], 0);
  assert.equal(noStore.storeAmount, 0);
  assert.equal(noStore.vendorAmount, 1000);
  assert.equal(noStore.cashDueLocation, 0);

  const custom = calculateVisit([machine], 35);
  assert.equal(custom.storeAmount, 350);
  assert.equal(custom.vendorAmount, 650);
  assert.equal(custom.cashDueLocation, 350);
});

test('calculateVisit decimal rounding preserves totals', () => {
  const machine = { newIn: 1000.335, newOut: 0 };
  const result = calculateVisit([machine], 33);
  assert.equal(result.totalNet, 1000.34);
  assert.equal(result.storeAmount, 330.11);
  assert.equal(result.vendorAmount, 670.23);
  assert.equal(result.storeAmount + result.vendorAmount, result.totalNet);
});
