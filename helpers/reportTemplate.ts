import { Visit } from '../types';
import { formatCurrency, formatDate, formatTime } from './formatters';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export interface ReportSummary {
  storeSummaries: StoreSummary[];
  machineSummaries: MachineSummary[];
  visitRows: VisitRow[];
  settlementTotals: SettlementTotals;
  totalVisits: number;
  totalNet: number;
  totalStoreAmount: number;
  totalVendorAmount: number;
}

export interface StoreSummary {
  storeId: string;
  storeName: string;
  visitCount: number;
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
  storeAmount: number;
  vendorAmount: number;
}

export interface MachineSummary {
  storeId: string;
  storeName: string;
  machineId: string;
  machineNumber: string;
  machineName: string;
  visitCount: number;
  totalNewIn: number;
  totalNewOut: number;
  totalNet: number;
}

export interface VisitRow {
  visitId: string;
  storeName: string;
  employeeName: string;
  businessDate: string;
  runAt: string;
  totalNet: number;
  result: 'positive' | 'zero' | 'negative';
  settlementStatus: 'not_submitted' | 'submitted';
  printStatus: 'not_printed' | 'printed';
}

export interface SettlementTotals {
  submittedCount: number;
  notSubmittedCount: number;
  printedCount: number;
  notPrintedCount: number;
  totalStoreAmount: number;
  totalVendorAmount: number;
  positiveCount: number;
  zeroCount: number;
  negativeCount: number;
}

export const buildReportSummary = (visits: Visit[]): ReportSummary => {
  const storeMap = new Map<string, StoreSummary>();
  const machineMap = new Map<string, MachineSummary>();
  const visitRows: VisitRow[] = [];
  let totalNet = 0;
  let totalStoreAmount = 0;
  let totalVendorAmount = 0;

  const settlementTotals: SettlementTotals = {
    submittedCount: 0,
    notSubmittedCount: 0,
    printedCount: 0,
    notPrintedCount: 0,
    totalStoreAmount: 0,
    totalVendorAmount: 0,
    positiveCount: 0,
    zeroCount: 0,
    negativeCount: 0,
  };

  for (const visit of visits) {
    totalNet += visit.totalNet;
    totalStoreAmount += visit.storeAmount;
    totalVendorAmount += visit.vendorAmount;

    const store = storeMap.get(visit.storeId) ?? {
      storeId: visit.storeId,
      storeName: visit.storeName,
      visitCount: 0,
      totalNewIn: 0,
      totalNewOut: 0,
      totalNet: 0,
      storeAmount: 0,
      vendorAmount: 0,
    };
    store.visitCount += 1;
    store.totalNewIn += visit.totalNewIn;
    store.totalNewOut += visit.totalNewOut;
    store.totalNet += visit.totalNet;
    store.storeAmount += visit.storeAmount;
    store.vendorAmount += visit.vendorAmount;
    storeMap.set(visit.storeId, store);

    for (const machine of visit.machines) {
      const key = `${visit.storeId}:${machine.machineId}`;
      const machineSummary = machineMap.get(key) ?? {
        storeId: visit.storeId,
        storeName: visit.storeName,
        machineId: machine.machineId,
        machineNumber: machine.machineNumber,
        machineName: machine.name,
        visitCount: 0,
        totalNewIn: 0,
        totalNewOut: 0,
        totalNet: 0,
      };
      machineSummary.visitCount += 1;
      machineSummary.totalNewIn += machine.newIn;
      machineSummary.totalNewOut += machine.newOut;
      machineSummary.totalNet += machine.machineNet;
      machineMap.set(key, machineSummary);
    }

    const timestamp = visit.timestamp?.toDate?.();
    visitRows.push({
      visitId: visit.id,
      storeName: visit.storeName,
      employeeName: visit.employeeName,
      businessDate: visit.businessDate,
      runAt: timestamp ? `${formatDate(timestamp)} ${formatTime(timestamp)}` : formatDate(visit.businessDate),
      totalNet: visit.totalNet,
      result: visit.result,
      settlementStatus: visit.settlementStatus,
      printStatus: visit.printStatus,
    });

    if (visit.settlementStatus === 'submitted') settlementTotals.submittedCount += 1;
    else settlementTotals.notSubmittedCount += 1;
    if (visit.printStatus === 'printed') settlementTotals.printedCount += 1;
    else settlementTotals.notPrintedCount += 1;
    settlementTotals.totalStoreAmount += visit.storeAmount;
    settlementTotals.totalVendorAmount += visit.vendorAmount;
    if (visit.result === 'positive') settlementTotals.positiveCount += 1;
    else if (visit.result === 'negative') settlementTotals.negativeCount += 1;
    else settlementTotals.zeroCount += 1;
  }

  return {
    storeSummaries: Array.from(storeMap.values()).sort((a, b) => b.totalNet - a.totalNet),
    machineSummaries: Array.from(machineMap.values()).sort((a, b) => b.totalNet - a.totalNet),
    visitRows: visitRows.sort((a, b) => (a.runAt > b.runAt ? -1 : 1)),
    settlementTotals,
    totalVisits: visits.length,
    totalNet,
    totalStoreAmount,
    totalVendorAmount,
  };
};

const resultLabel = (result: 'positive' | 'zero' | 'negative') =>
  result === 'positive' ? 'Positive' : result === 'negative' ? 'Negative' : 'Zero';

export const generateReportHtml = (
  summary: ReportSummary,
  startDate: string,
  endDate: string,
  businessName?: string
): string => {
  const storeRows = summary.storeSummaries
    .map(
      s => `
      <tr>
        <td>${escapeHtml(s.storeName)}</td>
        <td class="num">${s.visitCount}</td>
        <td class="num">${formatCurrency(s.totalNewIn)}</td>
        <td class="num">${formatCurrency(s.totalNewOut)}</td>
        <td class="num strong">${formatCurrency(s.totalNet)}</td>
        <td class="num">${formatCurrency(s.storeAmount)}</td>
        <td class="num">${formatCurrency(s.vendorAmount)}</td>
      </tr>`
    )
    .join('');

  const machineRows = summary.machineSummaries
    .map(
      m => `
      <tr>
        <td>${escapeHtml(m.storeName)}</td>
        <td>${escapeHtml(m.machineNumber)}</td>
        <td>${escapeHtml(m.machineName)}</td>
        <td class="num">${m.visitCount}</td>
        <td class="num">${formatCurrency(m.totalNewIn)}</td>
        <td class="num">${formatCurrency(m.totalNewOut)}</td>
        <td class="num strong">${formatCurrency(m.totalNet)}</td>
      </tr>`
    )
    .join('');

  const visitRows = summary.visitRows
    .map(
      v => `
      <tr>
        <td>${escapeHtml(v.runAt)}</td>
        <td>${escapeHtml(v.storeName)}</td>
        <td>${escapeHtml(v.employeeName)}</td>
        <td class="num strong">${formatCurrency(v.totalNet)}</td>
        <td>${resultLabel(v.result)}</td>
        <td>${v.settlementStatus === 'submitted' ? 'Submitted' : 'Not submitted'}</td>
        <td>${v.printStatus === 'printed' ? 'Printed' : 'Not printed'}</td>
      </tr>`
    )
    .join('');

  const generatedAt = new Date().toLocaleString();

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1505; font-size: 11px; }
          h1 { margin: 0 0 2px; font-size: 22px; color: #7B5BB8; }
          h2 { margin: 18px 0 6px; font-size: 14px; color: #B8860B; border-bottom: 1px solid #DCD7CD; padding-bottom: 3px; }
          .meta { color: #5C5750; font-size: 10px; margin-bottom: 12px; }
          .kpi-row { display: flex; gap: 10px; margin-bottom: 12px; }
          .kpi { flex: 1; border: 1px solid #DCD7CD; border-radius: 6px; padding: 8px 10px; }
          .kpi .label { font-size: 9px; color: #8A857C; text-transform: uppercase; letter-spacing: 0.5px; }
          .kpi .value { font-size: 16px; font-weight: 700; color: #1A1505; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: #5C5750; padding: 4px 6px; border-bottom: 2px solid #DCD7CD; }
          td { padding: 4px 6px; border-bottom: 1px solid #EFEBE2; font-size: 10px; }
          td.num { text-align: right; font-variant-numeric: tabular-nums; }
          td.strong, .kpi .value { font-weight: 700; }
          .footer { margin-top: 18px; font-size: 9px; color: #8A857C; text-align: center; }
        </style>
      </head>
      <body>
        <h1>SKILLROUT REPORT</h1>
        <div class="meta">
          ${businessName ? `<strong>${escapeHtml(businessName)}</strong><br />` : ''}
          Period: ${formatDate(startDate)} – ${formatDate(endDate)}<br />
          Generated: ${generatedAt}
        </div>

        <div class="kpi-row">
          <div class="kpi"><div class="label">Visits</div><div class="value">${summary.totalVisits}</div></div>
          <div class="kpi"><div class="label">Total Net</div><div class="value">${formatCurrency(summary.totalNet)}</div></div>
          <div class="kpi"><div class="label">Store Amount</div><div class="value">${formatCurrency(summary.totalStoreAmount)}</div></div>
          <div class="kpi"><div class="label">Vendor Amount</div><div class="value">${formatCurrency(summary.totalVendorAmount)}</div></div>
        </div>

        <h2>Settlement Breakdown</h2>
        <table>
          <tr>
            <th>Submitted</th><th>Not Submitted</th><th>Printed</th><th>Not Printed</th>
            <th>Positive</th><th>Zero</th><th>Negative</th>
          </tr>
          <tr>
            <td class="num">${summary.settlementTotals.submittedCount}</td>
            <td class="num">${summary.settlementTotals.notSubmittedCount}</td>
            <td class="num">${summary.settlementTotals.printedCount}</td>
            <td class="num">${summary.settlementTotals.notPrintedCount}</td>
            <td class="num">${summary.settlementTotals.positiveCount}</td>
            <td class="num">${summary.settlementTotals.zeroCount}</td>
            <td class="num">${summary.settlementTotals.negativeCount}</td>
          </tr>
        </table>

        <h2>Store Summary</h2>
        <table>
          <tr><th>Store</th><th>Visits</th><th>New IN</th><th>New OUT</th><th>Net</th><th>Store $</th><th>Vendor $</th></tr>
          ${storeRows || '<tr><td colspan="7">No visits in range.</td></tr>'}
        </table>

        <h2>Machine Summary</h2>
        <table>
          <tr><th>Store</th><th>Machine #</th><th>Name</th><th>Visits</th><th>New IN</th><th>New OUT</th><th>Net</th></tr>
          ${machineRows || '<tr><td colspan="7">No machine activity in range.</td></tr>'}
        </table>

        <h2>Visit List</h2>
        <table>
          <tr><th>Run At</th><th>Store</th><th>Employee</th><th>Net</th><th>Result</th><th>Settlement</th><th>Print</th></tr>
          ${visitRows || '<tr><td colspan="7">No visits in range.</td></tr>'}
        </table>

        <div class="footer">Generated by Skillrout · ${generatedAt}</div>
      </body>
    </html>
  `;
};
