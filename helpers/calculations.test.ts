import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateMachine, calculateLiveReadings, calculateVisit, round2 } from './calculations';

test('round2 rounds to two decimals with epsilon correction', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2(1.004), 1.0);
  assert.equal(round2(1.235), 1.24);
  assert.equal(round2(1.234), 1.23);
  assert.equal(round2(-1.235), -1.23);
  assert.equal(round2(0), 0);
  assert.equal(round2(1_000_000), 1_000_000);
});

test('calculateMachine positive net', () => {
  const result = calculateMachine(1000, 500, 1500, 700);
  assert.deepEqual(result, { newIn: 500, newOut: 200, machineNet: 300 });
});

test('calculateMachine zero net', () => {
  const result = calculateMachine(1000, 500, 1200, 700);
  assert.deepEqual(result, { newIn: 200, newOut: 200, machineNet: 0 });
});

test('calculateMachine negative net', () => {
  const result = calculateMachine(1000, 500, 1100, 700);
  assert.deepEqual(result, { newIn: 100, newOut: 200, machineNet: -100 });
});

test('calculateMachine exact baseline', () => {
  const result = calculateMachine(1000, 500, 1000, 500);
  assert.deepEqual(result, { newIn: 0, newOut: 0, machineNet: 0 });
});

test('calculateMachine large values', () => {
  const result = calculateMachine(1_000_000, 500_000, 2_000_000, 1_200_000);
  assert.deepEqual(result, { newIn: 1_000_000, newOut: 700_000, machineNet: 300_000 });
});

test('calculateVisit positive with 50/50 split', () => {
  const machines = [
    { machineId: 'm1', machineNumber: '1', name: 'M1', lastSettledIn: 1000, lastSettledOut: 500, presentIn: 1500, presentOut: 700, newIn: 500, newOut: 200, machineNet: 300 },
    { machineId: 'm2', machineNumber: '2', name: 'M2', lastSettledIn: 100, lastSettledOut: 50, presentIn: 250, presentOut: 100, newIn: 150, newOut: 50, machineNet: 100 },
  ] as any;
  const result = calculateVisit(machines, 50);
  assert.equal(result.totalNewIn, 650);
  assert.equal(result.totalNewOut, 250);
  assert.equal(result.totalNet, 400);
  assert.equal(result.result, 'positive');
  assert.equal(result.storeAmount, 200);
  assert.equal(result.vendorAmount, 200);
  assert.equal(result.cashDueLocation, 450);
});

test('calculateVisit zero result', () => {
  const machines = [
    { machineId: 'm1', machineNumber: '1', name: 'M1', lastSettledIn: 1000, lastSettledOut: 500, presentIn: 1500, presentOut: 1000, newIn: 500, newOut: 500, machineNet: 0 },
  ] as any;
  const result = calculateVisit(machines, 60);
  assert.equal(result.totalNet, 0);
  assert.equal(result.result, 'zero');
  assert.equal(result.storeAmount, 0);
  assert.equal(result.vendorAmount, 0);
  assert.equal(result.cashDueLocation, 500);
});

test('calculateVisit negative result', () => {
  const machines = [
    { machineId: 'm1', machineNumber: '1', name: 'M1', lastSettledIn: 1000, lastSettledOut: 500, presentIn: 1500, presentOut: 1200, newIn: 500, newOut: 700, machineNet: -200 },
  ] as any;
  const result = calculateVisit(machines, 60);
  assert.equal(result.totalNet, -200);
  assert.equal(result.result, 'negative');
  assert.equal(result.storeAmount, -120);
  assert.equal(result.vendorAmount, -80);
  assert.equal(result.cashDueLocation, 580);
});

test('calculateVisit split variations', () => {
  const machine = { machineId: 'm1', machineNumber: '1', name: 'M1', lastSettledIn: 0, lastSettledOut: 0, presentIn: 1000, presentOut: 0, newIn: 1000, newOut: 0, machineNet: 1000 } as any;

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
  const machine = {
    machineId: 'm1', machineNumber: '1', name: 'M1', lastSettledIn: 0, lastSettledOut: 0,
    presentIn: 1000.335, presentOut: 0, newIn: 1000.335, newOut: 0, machineNet: 1000.335,
  } as any;
  const result = calculateVisit([machine], 33);
  assert.equal(result.totalNet, 1000.34);
  assert.equal(result.storeAmount, 330.11);
  assert.equal(result.vendorAmount, 670.23);
  assert.equal(result.storeAmount + result.vendorAmount, result.totalNet);
});

test('calculateLiveReadings aggregates and ignores nulls', () => {
  const machines = [
    { id: 'm1', lastSettledIn: 1000, lastSettledOut: 500 },
    { id: 'm2', lastSettledIn: 100, lastSettledOut: 50 },
  ] as any;
  const readings = {
    m1: { presentIn: 1500, presentOut: 700 },
    m2: { presentIn: null, presentOut: 100 },
  } as any;
  const totals = calculateLiveReadings(machines, readings);
  assert.equal(totals.presentIn, 1500);
  assert.equal(totals.newIn, 500);
  assert.equal(totals.presentOut, 800);
  assert.equal(totals.newOut, 250);
  assert.equal(totals.presentNet, 700);
  assert.equal(totals.activityNet, 250);
});

test('calculateLiveReadings matches per-machine calculateMachine totals', () => {
  const machines = [
    { id: 'm1', lastSettledIn: 1000, lastSettledOut: 500 },
    { id: 'm2', lastSettledIn: 100, lastSettledOut: 50 },
  ] as any;
  const readings = {
    m1: { presentIn: 1500, presentOut: 700 },
    m2: { presentIn: 250, presentOut: 100 },
  } as any;
  const totals = calculateLiveReadings(machines, readings);

  const m1 = calculateMachine(1000, 500, 1500, 700);
  const m2 = calculateMachine(100, 50, 250, 100);

  assert.equal(totals.newIn, round2(m1.newIn + m2.newIn));
  assert.equal(totals.newOut, round2(m1.newOut + m2.newOut));
  assert.equal(totals.activityNet, round2(m1.machineNet + m2.machineNet));
});
