import { CollectionShift, ShiftReconciliation, Store, Visit } from '../types';
import { round2 } from './calculations';

export interface ShiftReportSummary {
  totalEmployees: number;
  totalShifts: number;
  grossCollected: number;
  payouts: number;
  net: number;
  storeShare: number;
  expectedReturnCash: number;
  actualCashReceived: number;
  totalDifference: number;
  inProgress: number;
  pendingReconciliation: number;
  partiallyReconciled: number;
  closed: number;
  employees: { employeeId: string; employeeName: string; shiftCount: number; expectedReturnCash: number; actualCashReceived: number; difference: number }[];
}

export interface ShiftStoreDetailRow {
  employeeName: string;
  employeeId: string;
  shiftId: string;
  startedAt: string;
  storeId: string;
  storeName: string;
  expectedReturnCash: number;
  actualCashReceived: number;
  difference: number;
  status: string;
  discrepancyReason?: string;
  receiptVerified: boolean;
  machineCount: number;
  visitCount: number;
}

export interface ShiftMachineDetailRow {
  employeeName: string;
  employeeId: string;
  shiftId: string;
  startedAt: string;
  storeId: string;
  storeName: string;
  visitId: string;
  businessDate: string;
  machineId: string;
  machineNumber: string;
  machineName: string;
  presentIn: number;
  presentOut: number;
  newIn: number;
  newOut: number;
  machineNet: number;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: string;
  note?: string;
}

const startOfDay = (dateInput: Date | string) => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
};

export const shiftStartedLocalDay = (shift: CollectionShift) => {
  if (!shift.startedAt?.toDate) return '';
  const d = shift.startedAt.toDate();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
};

const isWithinRange = (dateString: string, startDate: string, endDate: string) => {
  const d = startOfDay(dateString);
  const s = startOfDay(startDate);
  const e = startOfDay(endDate);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
};

export const buildShiftReport = (
  shifts: CollectionShift[],
  storeMap: Record<string, Store>,
  reconciliationsByShift: Record<string, ShiftReconciliation[]>,
  visitsByShift: Record<string, Visit[]>,
  startDate: string,
  endDate: string
): { summary: ShiftReportSummary; storeDetail: ShiftStoreDetailRow[]; machineDetail: ShiftMachineDetailRow[] } => {
  const filteredShifts = shifts.filter(s => isWithinRange(shiftStartedLocalDay(s), startDate, endDate));

  const employeeMap = new Map<string, { employeeId: string; employeeName: string; shiftCount: number; expectedReturnCash: number; actualCashReceived: number; difference: number }>();
  let expectedReturnCash = 0;
  let actualCashReceived = 0;
  let totalDifference = 0;
  let inProgress = 0;
  let pendingReconciliation = 0;
  let partiallyReconciled = 0;
  let closed = 0;

  const storeDetail: ShiftStoreDetailRow[] = [];
  const machineDetail: ShiftMachineDetailRow[] = [];

  for (const shift of filteredShifts) {
    expectedReturnCash = round2(expectedReturnCash + shift.expectedReturnCash);
    actualCashReceived = round2(actualCashReceived + shift.actualCashReceived);
    totalDifference = round2(totalDifference + shift.difference);

    if (shift.status === 'in_progress' || shift.status === 'returning') inProgress += 1;
    else if (shift.status === 'pending_reconciliation') pendingReconciliation += 1;
    else if (shift.status === 'partially_reconciled') partiallyReconciled += 1;
    else if (shift.status === 'closed') closed += 1;

    const existing = employeeMap.get(shift.employeeId);
    if (existing) {
      existing.shiftCount += 1;
      existing.expectedReturnCash = round2(existing.expectedReturnCash + shift.expectedReturnCash);
      existing.actualCashReceived = round2(existing.actualCashReceived + shift.actualCashReceived);
      existing.difference = round2(existing.difference + shift.difference);
    } else {
      employeeMap.set(shift.employeeId, {
        employeeId: shift.employeeId,
        employeeName: shift.employeeName || shift.employeeId,
        shiftCount: 1,
        expectedReturnCash: shift.expectedReturnCash,
        actualCashReceived: shift.actualCashReceived,
        difference: shift.difference,
      });
    }

    const recons = reconciliationsByShift[shift.id] || [];
    const reconByStore = Object.fromEntries(recons.map(r => [r.storeId, r]));
    const visits = visitsByShift[shift.id] || [];
    const submittedVisits = visits.filter(v => v.settlementStatus === 'submitted');
    const visitsByStore: Record<string, Visit[]> = {};
    for (const v of submittedVisits) {
      if (!visitsByStore[v.storeId]) visitsByStore[v.storeId] = [];
      visitsByStore[v.storeId].push(v);
    }

    for (const storeId of shift.storeIds) {
      const store = storeMap[storeId];
      const recon = reconByStore[storeId];
      const storeVisits = visitsByStore[storeId] || [];

      const visitExpected = storeVisits.reduce(
        (sum, v) => sum + (v.settlement?.vendorAmount ?? v.vendorAmount),
        0
      );
      const expected = recon ? recon.expectedReturnCash : round2(visitExpected);
      const actual = recon ? recon.actualCashReceived : 0;
      const difference = recon ? recon.difference : round2(0 - expected);

      storeDetail.push({
        employeeName: shift.employeeName || shift.employeeId,
        employeeId: shift.employeeId,
        shiftId: shift.id,
        startedAt: shiftStartedLocalDay(shift),
        storeId,
        storeName: recon?.storeName || store?.name || 'Unknown store',
        expectedReturnCash: expected,
        actualCashReceived: actual,
        difference,
        status: recon?.status || 'pending',
        discrepancyReason: recon?.discrepancyReason,
        receiptVerified: recon?.receiptVerified ?? false,
        machineCount: recon?.machineCount ?? storeVisits.reduce((c, v) => c + v.machines.length, 0),
        visitCount: storeVisits.length,
      });

      for (const visit of storeVisits) {
        const totalNet = visit.settlement?.totalNet ?? visit.totalNet;
        const vendorAmount = visit.settlement?.vendorAmount ?? visit.vendorAmount;
        for (const m of visit.machines) {
          const line = recon?.lineItems.find(l => l.machineId === m.machineId && l.visitId === visit.id);
          const machineExpected =
            totalNet > 0 ? round2(vendorAmount * (m.machineNet / totalNet)) : 0;
          const machineActual = line ? line.actualAmount : 0;
          const machineDifference = round2(machineActual - machineExpected);
          machineDetail.push({
            employeeName: shift.employeeName || shift.employeeId,
            employeeId: shift.employeeId,
            shiftId: shift.id,
            startedAt: shiftStartedLocalDay(shift),
            storeId,
            storeName: recon?.storeName || store?.name || 'Unknown store',
            visitId: visit.id,
            businessDate: visit.businessDate,
            machineId: m.machineId,
            machineNumber: m.machineNumber,
            machineName: m.name || '',
            presentIn: m.presentIn,
            presentOut: m.presentOut,
            newIn: m.newIn,
            newOut: m.newOut,
            machineNet: m.machineNet,
            expectedAmount: machineExpected,
            actualAmount: machineActual,
            difference: machineDifference,
            status: line ? line.status : 'pending',
            note: line ? line.note : undefined,
          });
        }
      }
    }
  }

  const summary: ShiftReportSummary = {
    totalEmployees: employeeMap.size,
    totalShifts: filteredShifts.length,
    grossCollected: round2(filteredShifts.reduce((s, x) => s + x.grossCollected, 0)),
    payouts: round2(filteredShifts.reduce((s, x) => s + x.payouts, 0)),
    net: round2(filteredShifts.reduce((s, x) => s + x.net, 0)),
    storeShare: round2(filteredShifts.reduce((s, x) => s + x.storeShare, 0)),
    expectedReturnCash,
    actualCashReceived,
    totalDifference,
    inProgress,
    pendingReconciliation,
    partiallyReconciled,
    closed,
    employees: Array.from(employeeMap.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
  };

  return { summary, storeDetail, machineDetail };
};
