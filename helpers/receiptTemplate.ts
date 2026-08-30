import { Visit } from '../types';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const groupThousands = (value: string): string => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Plain amount, no $ sign: "1555.00" (machine rows on the bookkeeping receipt).
export const receiptAmount = (value: number): string => {
  const isNegative = value < 0;
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  return `${isNegative ? '-' : ''}${groupThousands(int)}.${dec}`;
};

// Money amount, "$6,405.00"; negative prints "$-2,738.00" to match the mockups.
export const receiptMoney = (value: number): string => {
  const isNegative = value < 0;
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  return `$${isNegative ? '-' : ''}${groupThousands(int)}.${dec}`;
};

const receiptPercent = (value: number): string => `${value.toFixed(2)}%`;

export interface LastClearedInfo {
  date: string;
  time: string;
  amount: string;
  storeAmount: string;
  vendorAmount: string;
}

export interface ReceiptLines {
  title: string;
  storeName: string;
  storeAddress: string;
  date: string;
  time: string;
  visitId: string;
  employee: string;
  vouchersTotal: string;
  machines: { label: string; creditsIn: string; totalPaid: string }[];
  moneyIn: string;
  moneyOut: string;
  net: string;
  sharing: { label: string; amount: string }[];
  lastCleared: LastClearedInfo | null;
  disclaimer: string;
  status: string;
}

export const buildReceiptLines = (visit: Visit, lastCleared?: LastClearedInfo | null): ReceiptLines => {
  const timestamp = visit.timestamp?.toDate?.();
  const positive = visit.totalNet > 0;
  return {
    title: 'SKILLROUT',
    storeName: visit.storeName,
    storeAddress: visit.storeAddress || '',
    date: visit.businessDate,
    time: timestamp
      ? `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`
      : '',
    visitId: visit.id.slice(-8).toUpperCase(),
    employee: visit.employeeName,
    vouchersTotal: receiptMoney(visit.totalNewOut),
    machines: visit.machines.map(machine => ({
      label: `< ${machine.machineNumber} > Credits In`,
      creditsIn: receiptAmount(machine.newIn),
      totalPaid: receiptAmount(machine.newOut),
    })),
    moneyIn: receiptMoney(visit.totalNewIn),
    moneyOut: receiptMoney(visit.totalNewOut),
    net: receiptMoney(visit.totalNet),
    sharing: positive
      ? [
          { label: `Store (${receiptPercent(visit.storePercent)})`, amount: receiptMoney(visit.storeAmount) },
          { label: `Games (${receiptPercent(visit.vendorPercent)})`, amount: receiptMoney(visit.vendorAmount) },
        ]
      : [
          { label: 'No split (0.00%)', amount: '$0.00' },
          { label: 'No split (0.00%)', amount: '$0.00' },
        ],
    lastCleared: lastCleared ?? null,
    disclaimer:
      visit.totalNet < 0
        ? '* This visit closed with a negative net. It is provided as proof only and does not require payment.'
        : '',
    status: visit.settlementStatus === 'submitted' ? 'SUBMITTED' : 'NOT SUBMITTED',
  };
};

export const generateReceiptHtml = (visit: Visit, lastCleared?: LastClearedInfo | null): string => {
  const lines = buildReceiptLines(visit, lastCleared);
  const machineRows = lines.machines
    .map(
      machine => `
        <div class="row"><span>${escapeHtml(machine.label)}</span><span>${machine.creditsIn}</span></div>
        <div class="row pad"><span>Total Paid</span><span>${machine.totalPaid}</span></div>
      `
    )
    .join('');
  const sharingRows = lines.sharing
    .map(share => `<div class="row"><span>${escapeHtml(share.label)}</span><span>${share.amount}</span></div>`)
    .join('');
  const lastClearedHtml = lines.lastCleared
    ? `
      <div class="divider"></div>
      <div class="section-title strong">LAST CLEARED</div>
      <div class="row"><span>${escapeHtml(lines.lastCleared.date)} ${lines.lastCleared.time}</span><span>${lines.lastCleared.amount}</span></div>
      <div class="row"><span>Store</span><span>${lines.lastCleared.storeAmount}</span></div>
      <div class="row"><span>Games</span><span>${lines.lastCleared.vendorAmount}</span></div>
    `
    : `
      <div class="divider"></div>
      <div class="section-title strong">LAST CLEARED</div>
      <div class="na" style="text-align:center">No prior positive visit on record.</div>
    `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { width: 72mm; margin: 0 auto; font-family: 'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace; color: #171A20; font-size: 12px; line-height: 1.5; }
          h1 { margin: 0; text-align: center; font-size: 20px; letter-spacing: 2px; font-weight: 700; }
          .center { text-align: center; }
          .store { margin-top: 2px; text-align: center; }
          .divider { border-top: 1px dashed #171A20; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .pad { margin-bottom: 4px; }
          .section-title { text-align: center; letter-spacing: 1px; margin: 2px 0; }
          .big { text-align: center; font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 4px 0; }
          .strong { font-weight: 700; }
          .status { margin-top: 8px; text-align: center; font-weight: 700; letter-spacing: 1px; }
          .disclaimer { margin-top: 8px; text-align: center; font-size: 10px; font-style: italic; }
          .na { color: #555; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(lines.title)}</h1>
        <div class="store">${escapeHtml(lines.storeName)}</div>
        ${lines.storeAddress ? `<div class="store">${escapeHtml(lines.storeAddress)}</div>` : ''}
        <div class="divider"></div>
        <div class="row"><span>Date</span><span>${escapeHtml(lines.date)}</span></div>
        ${lines.time ? `<div class="row"><span>Time</span><span>${escapeHtml(lines.time)}</span></div>` : ''}
        <div class="row"><span>Visit</span><span>${escapeHtml(lines.visitId)}</span></div>
        <div class="row"><span>Employee</span><span>${escapeHtml(lines.employee)}</span></div>
        <div class="divider"></div>
        <div class="section-title">TOTAL VOUCHERS PRINTED</div>
        <div class="big">${lines.vouchersTotal}</div>
        <div class="divider"></div>
        ${machineRows}
        <div class="divider"></div>
        <div class="row strong"><span>Money In</span><span>${lines.moneyIn}</span></div>
        <div class="row strong"><span>Money Out</span><span>${lines.moneyOut}</span></div>
        <div class="row strong"><span>Net</span><span>${lines.net}</span></div>
        ${lines.disclaimer ? `<div class="disclaimer">${escapeHtml(lines.disclaimer)}</div>` : ''}
        <div class="divider"></div>
        <div class="section-title strong">NET SHARING</div>
        ${sharingRows}
        ${lastClearedHtml}
        <div class="divider"></div>
        <div class="status">${escapeHtml(lines.status)}</div>
      </body>
    </html>
  `;
};
