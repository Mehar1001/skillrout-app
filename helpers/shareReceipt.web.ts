import { generateReceiptHtml, type LastClearedInfo } from './receiptTemplate';
import { markPrinted } from '../services/visits';
import { Visit } from '../types';

const shareOrDownload = async (dataUrl: string, mimeType: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: mimeType });
  const browser = navigator as Navigator & { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean };
  if (browser.share && browser.canShare?.({ files: [file] })) {
    await browser.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const renderCapture = async (html: string, width: string) => {
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; left: -10000px; top: 0; width: ${width}; background: #fff; z-index: -1;`;
  container.innerHTML = html;
  document.body.appendChild(container);
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  return container;
};

const createPdf = async (dataUrl: string, filename: string, pageFormat: 'receipt' | 'report') => {
  const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
  if (pageFormat === 'receipt') {
    const width = 80;
    const height = Math.max(80, (image.height / image.width) * width);
    const pdf = new jsPDF({ unit: 'mm', format: [width, height] });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, width, height);
    await shareOrDownload(pdf.output('datauristring'), 'application/pdf', filename);
    return;
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
    pdf.addImage(dataUrl, 'JPEG', margin, margin - offset, contentWidth, imageHeight);
    offset += pageHeight - margin * 2;
  }
  await shareOrDownload(pdf.output('datauristring'), 'application/pdf', filename);
};

export const shareReceiptPdf = async (ownerId: string, visit: Visit, userId: string, lastCleared?: LastClearedInfo | null) => {
  await markPrinted(ownerId, visit.storeId, visit.id, userId);
  const container = await renderCapture(generateReceiptHtml(visit, lastCleared), '72mm');
  try {
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(container, { quality: 0.92, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    await createPdf(dataUrl, `skillrout-receipt-${visit.id}.pdf`, 'receipt');
  } finally {
    container.remove();
  }
};

export const shareReceiptJpeg = async (ownerId: string, visit: Visit, userId: string, lastCleared?: LastClearedInfo | null) => {
  await markPrinted(ownerId, visit.storeId, visit.id, userId);
  const container = await renderCapture(generateReceiptHtml(visit, lastCleared), '72mm');
  try {
    const { toJpeg } = await import('html-to-image');
    const dataUrl = await toJpeg(container, { quality: 0.92, backgroundColor: '#FFFFFF', pixelRatio: 2 });
    await shareOrDownload(dataUrl, 'image/jpeg', `skillrout-receipt-${visit.id}.jpg`);
  } finally {
    container.remove();
  }
};
