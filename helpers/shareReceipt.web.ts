import { generateReceiptHtml, type LastClearedInfo } from './receiptTemplate';
import { markPrinted } from '../services/visits';
import { Visit } from '../types';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';

export type BrowserShareResult = 'shared' | 'downloaded';

const shareOrDownload = async (dataUrl: string, mimeType: string, filename: string): Promise<BrowserShareResult> => {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: mimeType });
  const browser = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean };
  if (browser.share && browser.canShare?.({ files: [file] })) {
    await browser.share({ files: [file], title: filename });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
};

const renderCapture = async (html: string, width: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; left: -10000px; top: 0; width: ${width}; padding: 0; background: #fff; color: #171A20; z-index: -1;`;
  parsed.head.querySelectorAll('style').forEach(style => container.appendChild(style.cloneNode(true)));
  const receipt = document.createElement('div');
  receipt.style.cssText = `box-sizing: border-box; width: ${width}; margin: 0; padding: 4mm; overflow: visible; background: #fff; color: #171A20; font-family: 'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.5;`;
  receipt.innerHTML = parsed.body.innerHTML;
  container.appendChild(receipt);
  document.body.appendChild(container);
  await document.fonts?.ready;
  await Promise.all(Array.from(container.querySelectorAll('img')).map(image => image.complete
    ? Promise.resolve()
    : new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      })));
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (receipt.scrollWidth <= 0 || receipt.scrollHeight <= 0) throw new Error('Receipt preview has no printable content.');
  return { container, receipt };
};

const createPdf = async (dataUrl: string, filename: string, pageFormat: 'receipt' | 'report'): Promise<BrowserShareResult> => {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) throw new Error('Receipt image could not be prepared for PDF.');
  if (pageFormat === 'receipt') {
    const pageWidth = 80;
    const margin = 4;
    const contentWidth = pageWidth - margin * 2;
    const imageHeight = (image.naturalHeight / image.naturalWidth) * contentWidth;
    const pageHeight = Math.max(80, imageHeight + margin * 2);
    const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight], orientation: 'portrait' });
    pdf.addImage(dataUrl, 'JPEG', margin, margin, contentWidth, imageHeight, undefined, 'FAST');
    return shareOrDownload(pdf.output('datauristring'), 'application/pdf', filename);
  }
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const imageHeight = (image.height / image.width) * contentWidth;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let offset = 0;
  while (offset < imageHeight) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', margin, margin - offset, contentWidth, imageHeight, undefined, 'FAST');
    offset += pageHeight - margin * 2;
  }
  return shareOrDownload(pdf.output('datauristring'), 'application/pdf', filename);
};

export const shareReceiptPdf = async (ownerId: string, visit: Visit, userId: string, lastCleared?: LastClearedInfo | null) => {
  const html = generateReceiptHtml(visit, lastCleared);
  if (!html) throw new Error('Failed to generate receipt HTML.');
  const { container, receipt } = await renderCapture(html, '80mm');
  try {
    const dataUrl = await toJpeg(receipt, { quality: 0.96, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    if (!dataUrl) throw new Error('Failed to generate receipt image.');
    const result = await createPdf(dataUrl, `skillrout-receipt-${visit.id}.pdf`, 'receipt');
    await markPrinted(ownerId, visit.storeId, visit.id, userId).catch(() => undefined);
    return result;
  } finally {
    container.remove();
  }
};

export const shareReceiptJpeg = async (
  ownerId: string,
  visit: Visit,
  userId: string,
  _receiptRef: unknown,
  lastCleared?: LastClearedInfo | null
) => {
  const html = generateReceiptHtml(visit, lastCleared);
  if (!html) throw new Error('Failed to generate receipt HTML.');
  const { container, receipt } = await renderCapture(html, '80mm');
  try {
    const dataUrl = await toJpeg(receipt, { quality: 0.96, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    if (!dataUrl) throw new Error('Failed to generate receipt image.');
    const result = await shareOrDownload(dataUrl, 'image/jpeg', `skillrout-receipt-${visit.id}.jpg`);
    await markPrinted(ownerId, visit.storeId, visit.id, userId).catch(() => undefined);
    return result;
  } finally {
    container.remove();
  }
};
