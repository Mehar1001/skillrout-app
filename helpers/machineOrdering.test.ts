import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { numericMachineNumber, sortMachinesByNumber } from './machineOrdering';

describe('machine ordering', () => {
  it('sorts machine numbers numerically', () => {
    const sorted = sortMachinesByNumber([
      { id: 'ten', machineNumber: '10' },
      { id: 'two', machineNumber: '2' },
      { id: 'one', machineNumber: '1' },
    ]);
    assert.deepEqual(sorted.map(machine => machine.machineNumber), ['1', '2', '10']);
  });

  it('sorts existing four-digit numbers numerically', () => {
    const sorted = sortMachinesByNumber([
      { machineNumber: '1003' },
      { machineNumber: '1001' },
      { machineNumber: '1002' },
    ]);
    assert.deepEqual(sorted.map(machine => machine.machineNumber), ['1001', '1002', '1003']);
  });

  it('places nonnumeric legacy identifiers after numeric serials', () => {
    const sorted = sortMachinesByNumber([
      { machineNumber: 'B-2' },
      { machineNumber: '2' },
      { machineNumber: 'A-1' },
      { machineNumber: '1' },
    ]);
    assert.deepEqual(sorted.map(machine => machine.machineNumber), ['1', '2', 'A-1', 'B-2']);
  });

  it('only accepts positive integer serials', () => {
    assert.equal(numericMachineNumber(' 3 '), 3);
    assert.equal(numericMachineNumber('001'), 1);
    assert.equal(numericMachineNumber('0'), null);
    assert.equal(numericMachineNumber('1A'), null);
  });
});
