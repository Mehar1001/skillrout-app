import * as XLSX from 'xlsx';
import { ShiftMachineDetailRow, ShiftReportSummary, ShiftStoreDetailRow } from './shiftReport';

const formatCurrency = (value: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return value.toFixed(2);
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'pending':
    case 'pending_reconciliation':
      return 'Needs Cash';
    case 'reconciled':
      return 'Received';
    case 'partially_reconciled':
      return 'Partly Received';
    case 'discrepancy':
      return 'Difference';
    case 'in_progress':
      return 'In Progress';
    case 'returning':
      return 'Returning';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
};

export const buildShiftReportWorkbook = (
  summary: ShiftReportSummary,
  storeDetail: ShiftStoreDetailRow[],
  machineDetail: ShiftMachineDetailRow[]
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();

  // Summary sheet: overall metrics + employee rows
  const summaryAoa: (string | number)[][] = [
    ['Metric', 'Value'],
    ['Total Employees', summary.totalEmployees],
    ['Total Shifts', summary.totalShifts],
    ['Gross Collected', formatCurrency(summary.grossCollected)],
    ['Payouts', formatCurrency(summary.payouts)],
    ['Net', formatCurrency(summary.net)],
    ['Store Share', formatCurrency(summary.storeShare)],
    ['Expected Return Cash', formatCurrency(summary.expectedReturnCash)],
    ['Cash Received', formatCurrency(summary.actualCashReceived)],
    ['Total Difference', formatCurrency(summary.totalDifference)],
    ['In Progress', summary.inProgress],
    ['Needs Cash', summary.pendingReconciliation],
    ['Partly Received', summary.partiallyReconciled],
    ['Closed', summary.closed],
    [],
    ['Employee', 'Shifts', 'Expected', 'Received', 'Difference'],
    ...summary.employees.map(e => [
      e.employeeName,
      e.shiftCount,
      formatCurrency(e.expectedReturnCash),
      formatCurrency(e.actualCashReceived),
      formatCurrency(e.difference),
    ]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Store Detail sheet
  const storeRows = storeDetail.map(s => ({
    Employee: s.employeeName,
    'Employee ID': s.employeeId,
    'Shift ID': s.shiftId,
    'Started At': s.startedAt,
    Store: s.storeName,
    'Store ID': s.storeId,
    'Expected Return Cash': formatCurrency(s.expectedReturnCash),
    'Cash Received': formatCurrency(s.actualCashReceived),
    Difference: formatCurrency(s.difference),
    Status: formatStatus(s.status),
    'Difference Reason': s.discrepancyReason || '',
    'Receipt Verified': s.receiptVerified ? 'Yes' : 'No',
    'Machine Count': s.machineCount,
    'Visit Count': s.visitCount,
  }));
  const storeSheet = XLSX.utils.json_to_sheet(storeRows);
  XLSX.utils.book_append_sheet(wb, storeSheet, 'Store Detail');

  // Machine Detail sheet
  const machineRows = machineDetail.map(m => ({
    Employee: m.employeeName,
    'Employee ID': m.employeeId,
    'Shift ID': m.shiftId,
    'Started At': m.startedAt,
    Store: m.storeName,
    'Store ID': m.storeId,
    Visit: m.visitId,
    'Business Date': m.businessDate,
    'Machine Number': m.machineNumber,
    'Machine Name': m.machineName,
    'Present IN': m.presentIn,
    'Present OUT': m.presentOut,
    'New IN': m.newIn,
    'New OUT': m.newOut,
    'Machine Net': m.machineNet,
    'Expected Amount': formatCurrency(m.expectedAmount),
    'Cash Received': formatCurrency(m.actualAmount),
    Difference: formatCurrency(m.difference),
    Status: formatStatus(m.status),
    Note: m.note || '',
  }));
  const machineSheet = XLSX.utils.json_to_sheet(machineRows);
  XLSX.utils.book_append_sheet(wb, machineSheet, 'Machine Detail');

  return wb;
};
