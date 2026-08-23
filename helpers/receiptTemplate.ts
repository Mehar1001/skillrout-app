import { Visit } from '../types';
import { formatCurrency, formatDate, formatTime } from './formatters';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export const generateReceiptHtml = (visit: Visit): string => {
  const timestamp = visit.timestamp?.toDate?.();
  const machineRows = visit.machines
    .map(
      machine => `
        <section class="machine">
          <h2>Machine ${escapeHtml(machine.machineNumber)}${machine.name ? ` · ${escapeHtml(machine.name)}` : ''}</h2>
          <div class="row"><span>Last Credits In</span><span>${formatCurrency(machine.lastSettledIn)}</span></div>
          <div class="row"><span>Credits In</span><span>${formatCurrency(machine.presentIn)}</span></div>
          <div class="row"><span>New Credits In</span><span>${formatCurrency(machine.newIn)}</span></div>
          <div class="row"><span>Last Total Paid</span><span>${formatCurrency(machine.lastSettledOut)}</span></div>
          <div class="row"><span>Total Paid</span><span>${formatCurrency(machine.presentOut)}</span></div>
          <div class="row"><span>New Total Paid</span><span>${formatCurrency(machine.newOut)}</span></div>
          <div class="row strong"><span>Machine Net</span><span>${formatCurrency(machine.machineNet)}</span></div>
        </section>
      `
    )
    .join('');
  const status = visit.settlementStatus === 'submitted' ? 'SUBMITTED' : 'PRINTED — NOT SUBMITTED';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { width: 72mm; margin: 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #2A2A2A; font-size: 11px; }
          h1 { margin: 0; text-align: center; font-size: 18px; }
          h2 { margin: 8px 0 4px; font-size: 12px; }
          .store { margin-top: 3px; text-align: center; font-weight: 700; }
          .meta { margin-top: 8px; line-height: 1.45; }
          .divider { border-top: 1px dashed #5A5A5A; margin: 8px 0; }
          .machine { padding-bottom: 6px; border-bottom: 1px dashed #C8C4BB; }
          .row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
          .strong { font-weight: 700; }
          .status { margin-top: 10px; padding: 7px; border: 1px solid #7B5BB8; color: #5C4499; font-weight: 700; text-align: center; }
        </style>
      </head>
      <body>
        <h1>SKILLROUT</h1>
        <div class="store">${escapeHtml(visit.storeName)}</div>
        <div class="meta">
          Visit: ${escapeHtml(visit.id)}<br />
          Employee: ${escapeHtml(visit.employeeName)}<br />
          Business date: ${formatDate(visit.businessDate)}<br />
          ${timestamp ? `RUN: ${formatDate(timestamp)} ${formatTime(timestamp)}` : ''}
        </div>
        <div class="divider"></div>
        ${machineRows}
        <div class="divider"></div>
        <div class="row"><span>Total Money In</span><span>${formatCurrency(visit.totalNewIn)}</span></div>
        <div class="row"><span>Total Money Out</span><span>${formatCurrency(visit.totalNewOut)}</span></div>
        <div class="row strong"><span>Total Net</span><span>${formatCurrency(visit.totalNet)}</span></div>
        <div class="row"><span>Store ${visit.storePercent}%</span><span>${formatCurrency(visit.storeAmount)}</span></div>
        <div class="row"><span>Vendor ${visit.vendorPercent}%</span><span>${formatCurrency(visit.vendorAmount)}</span></div>
        <div class="row strong"><span>Cash Due Location</span><span>${formatCurrency(visit.cashDueLocation)}</span></div>
        <div class="status">${status}</div>
      </body>
    </html>
  `;
};
