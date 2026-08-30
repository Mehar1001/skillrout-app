import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchReceiptCandidates, normalizeReceiptMachineNumber } from './receiptMachineMatching';
import { Machine } from '../types';

const baseMachine = {
  storeId: 's1',
  active: true,
  lastSettledIn: 0,
  lastSettledOut: 0,
  lastSubmittedVisitId: null,
  lastSubmittedAt: null,
  baselineVersion: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const makeMachine = (id: string, machineNumber: string, name: string): Machine =>
  ({ ...baseMachine, id, machineNumber, name }) as unknown as Machine;

const candidate = (receiptMachineNumber: string) => ({
  receiptMachineNumber,
  presentIn: 0,
  presentOut: 0,
  confidence: 0.5,
  warnings: [],
});

describe('receipt machine matching', () => {
  describe('normalizeReceiptMachineNumber', () => {
    it('strips brackets and whitespace and leading zeros', () => {
      assert.equal(normalizeReceiptMachineNumber('  [0101]  '), '101');
    });

    it('fixes common OCR misreads', () => {
      assert.equal(normalizeReceiptMachineNumber('  [O1O]  '), '10');
    });

    it('falls back to 0 for empty input', () => {
      assert.equal(normalizeReceiptMachineNumber('   '), '0');
    });
  });

  describe('matchReceiptCandidates', () => {
    it('matches a unique machine and fills in its details', () => {
      const machines = [makeMachine('m1', '101', 'Red Corner'), makeMachine('m2', '102', 'Blue Corner')];
      const rows = matchReceiptCandidates(machines, [candidate('101')]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].machineId, 'm1');
      assert.equal(rows[0].machineNumber, '101');
      assert.equal(rows[0].machineName, 'Red Corner');
    });

    it('warns when no machine matches', () => {
      const machines = [makeMachine('m1', '101', 'Red Corner')];
      const rows = matchReceiptCandidates(machines, [candidate('999')]);
      assert.equal(rows[0].machineId, null);
      assert.ok(rows[0].warnings.some(w => w.includes('not configured')));
    });

    it('warns when more than one machine matches', () => {
      const machines = [makeMachine('m1', '101', 'Red Corner'), makeMachine('m2', '0101', 'Blue Corner')];
      const rows = matchReceiptCandidates(machines, [candidate('101')]);
      assert.equal(rows[0].machineId, null);
      assert.ok(rows[0].warnings.some(w => w.includes('more than one')));
    });

    it('fuzzy matches one-character OCR errors', () => {
      const machines = [makeMachine('m1', '101', 'Red Corner'), makeMachine('m2', '1022', 'Blue Corner')];
      const rows = matchReceiptCandidates(machines, [candidate('100')]);
      assert.equal(rows[0].machineId, 'm1');
      assert.ok(rows[0].warnings.some(w => w.includes('Fuzzy match')));
    });
  });
});
