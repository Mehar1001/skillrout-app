import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildReceiptLines, generateReceiptHtml } from './receiptTemplate';
import { Visit } from '../types';

const visit = {
  id: 'visit-12345678',
  ownerId: 'owner-1',
  storeId: 'store-1',
  storeName: 'El Rancho',
  employeeId: 'employee-1',
  employeeName: 'Employee',
  businessDate: '2026-04-24',
  timestamp: { toDate: () => new Date('2026-04-24T18:23:00') },
  machines: [
    {
      machineId: 'machine-1',
      machineNumber: '786339',
      name: 'Lightning2',
      lastSettledIn: 37078,
      lastSettledOut: 19040,
      presentIn: 42693,
      presentOut: 25880,
      newIn: 5615,
      newOut: 6840,
      machineNet: -1225,
    },
  ],
  totalNewIn: 5615,
  totalNewOut: 6840,
  totalNet: -1225,
  result: 'negative',
  storePercent: 50,
  vendorPercent: 50,
  storeAmount: 0,
  vendorAmount: 0,
  cashDueLocation: 0,
  visitStatus: 'completed',
  settlementStatus: 'not_submitted',
  printStatus: 'not_printed',
} as Visit;

describe('receipt machine values', () => {
  it('builds last-to-present ranges and per-machine cash and payout', () => {
    const machine = buildReceiptLines(visit).machines[0];
    assert.deepEqual(machine, {
      label: 'Lightning2 (786339)',
      inRange: '37,078.00 - 42,693.00',
      outRange: '19,040.00 - 25,880.00',
      cash: '$5,615.00',
      payout: '($6,840.00)',
    });
  });

  it('renders machine values in printable HTML', () => {
    const html = generateReceiptHtml(visit);
    assert.match(html, /Lightning2 \(786339\)/);
    assert.match(html, /37,078\.00 - 42,693\.00/);
    assert.match(html, /Cash<\/span><span>\$5,615\.00/);
    assert.match(html, /Payout \*<\/span><span>\(\$6,840\.00\)/);
  });
});
