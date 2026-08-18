import { Visit } from '../types';
import { formatCurrency } from './formatters';

export const generateReceiptHtml = (visit: Visit): string => {
  const machineRows = visit.machines
    .map(
      m => `
        <tr>
          <td>${m.machineNumber}</td>
          <td>${m.lastSettledIn}</td>
          <td>${m.presentIn}</td>
          <td>${m.newIn}</td>
          <td>${m.lastSettledOut}</td>
          <td>${m.presentOut}</td>
          <td>${m.newOut}</td>
          <td>${formatCurrency(m.machineNet)}</td>
        </tr>
      `
    )
    .join('');

  const status = visit.settlementStatus === 'submitted' ? 'SUBMITTED' : 'PRINTED – NOT SUBMITTED';

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #2A2A2A; }
          h1 { font-size: 20px; margin-bottom: 8px; }
          .meta { font-size: 14px; color: #5A5A5A; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
          th, td { border: 1px solid #C8C4BB; padding: 6px; text-align: left; }
          th { background-color: #E0DDD6; }
          .totals { margin-top: 16px; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .status { margin-top: 16px; padding: 8px; background: #F7F4F0; border: 1px solid #C8C4BB; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${visit.storeName}</h1>
        <div class="meta">
          Run ID: ${visit.id}<br/>
          Employee: ${visit.employeeName}<br/>
          Date: ${new Date().toLocaleString()}
        </div>
        <table>
          <thead>
            <tr>
              <th>Machine</th>
              <th>Last IN</th>
              <th>Present IN</th>
              <th>New IN</th>
              <th>Last OUT</th>
              <th>Present OUT</th>
              <th>New OUT</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            ${machineRows}
          </tbody>
        </table>
        <div class="totals">
          <div class="row"><span>Total New IN:</span><span>${formatCurrency(visit.totalNewIn)}</span></div>
          <div class="row"><span>Total New OUT:</span><span>${formatCurrency(visit.totalNewOut)}</span></div>
          <div class="row"><span>Net:</span><span><strong>${formatCurrency(visit.totalNet)}</strong></span></div>
          <div class="row"><span>Store %:</span><span>${visit.storePercent}%</span></div>
          <div class="row"><span>Store Amount:</span><span>${formatCurrency(visit.storeAmount)}</span></div>
          <div class="row"><span>Vendor Amount:</span><span>${formatCurrency(visit.vendorAmount)}</span></div>
          <div class="row"><span>Cash Due Location:</span><span>${formatCurrency(visit.cashDueLocation)}</span></div>
        </div>
        <div class="status">${status}</div>
      </body>
    </html>
  `;
};
